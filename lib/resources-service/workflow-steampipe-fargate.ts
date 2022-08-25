import * as path from 'path';
import { Duration, Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import { InstanceConfig } from '../';
import { NetworkLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
let taskDefinition: ecs.FargateTaskDefinition;

export function createSteampipeFargate(stack: Stack, instance: InstanceConfig) {
    const vpc = ec2.Vpc.fromLookup(stack, 'datahub-vpc', {
        vpcName: `${instance.name}-network-stack/steampipe-vpc`,
    });

    const subnet_group_name = `steampipe-private-subnet-1`;

    const ec2_sg_fargate = new ec2.SecurityGroup(stack, `steampipe-ec2-sg-fargate`, {
        vpc: vpc,
        allowAllOutbound: true,
        description: 'manages the security policy for steampipe instance.',
        securityGroupName: `steampipe-ec2-sg-fargate`,
    });

    ec2_sg_fargate.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(9193), 'Allow postgres traffic');

    const cluster = createCluster(stack, vpc);
    const container = createTaskDefinition(stack, 'resources', instance);

    //8. Add port mappings to your container...Make sure you use TCP protocol for Network Load Balancer (NLB)
    container.addPortMappings({
        containerPort: 9193,
        hostPort: 9193,
        protocol: ecs.Protocol.TCP,
    });

    const nlb = NetworkLoadBalancer.fromLookup(stack, 'steampipe-listener', {
        loadBalancerTags: {
            lookupName: 'steampipe-nlb',
        },
    });

    //10. Add a listener on a particular port for the NLB
    const listener = nlb.addListener('steampipe-listener', {
        port: 9193,
    });

    const fargate = createFargateService(stack, cluster, ec2_sg_fargate, subnet_group_name);

    fargate.registerLoadBalancerTargets({
        containerName: 'ecs-container-steampipe',
        containerPort: 9193,
        newTargetGroupId: 'steampipe-tg',
        listener: ecs.ListenerConfig.networkListener(listener, {
            port: 9193,
            healthCheck: { port: 'traffic-port' },
            deregistrationDelay: cdk.Duration.seconds(300),
        }),
    });

    // setAutoscailing(fargate);    // Disabled for preventing data inconsistency between tasks due to cache

    new cdk.CfnOutput(stack, 'ClusterARN: ', { value: cluster.clusterArn });
    new cdk.CfnOutput(stack, GetSteampipeStackExportKey(instance.name), {
        value: 'steampipe_large_athena_datasource',
    });
}

function createCluster(stack: Stack, vpc: ec2.IVpc) {
    const cluster = new ecs.Cluster(stack, `ecs-cluster-steampipe`, {
        clusterName: `ecs-cluster-steampipe`,
        vpc: vpc,
    });

    return cluster;
}

function createTaskDefinition(stack: Stack, dockerPath: string, instance: InstanceConfig) {
    const image = new ecr_assets.DockerImageAsset(stack, `ecr-docker-steampipe`, {
        directory: path.join(__dirname, '.', dockerPath),
    });

    taskDefinition = new ecs.FargateTaskDefinition(stack, `ecs-fargate-task-definition-steampipe`, {
        cpu: 512 * 4,
        memoryLimitMiB: 1024 * 4,
    });

    //TODO : remove AdministratorAccess policy
    taskDefinition.taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

    // @TODO: get from utility function
    const steampipeSecretArn = `arn:aws:secretsmanager:ap-northeast-1:352298775703:secret:steampipe-ZS60Fk`;

    const container = taskDefinition.addContainer(`ecs-container-steampipe`, {
        image: ecs.ContainerImage.fromDockerImageAsset(image),
        logging: ecs.LogDriver.awsLogs({
            logGroup: new logs.LogGroup(stack, `log-loggroup-steampipe`, {
                logGroupName: `steampipe-fargate`,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                retention: logs.RetentionDays.ONE_WEEK,
            }),
            streamPrefix: 'ecs',
        }),
        secrets: {            
            POSTGRES_PASSWORD: ecs.Secret.fromSecretsManager(
                Secret.fromSecretCompleteArn(stack, 'secret-postgres-1', steampipeSecretArn),
                'steampipe/postgres/password'
            ),            
            TWITTER_TOKEN: ecs.Secret.fromSecretsManager(
                Secret.fromSecretCompleteArn(stack, 'secret-twitter-1', steampipeSecretArn),
                'steampipe/twitter/token'
            ),            
        },
        environment: {
            STEAMPIPE_MAX_PARALLEL: '20',
            THIS_INSTANCE_NAME: instance.name,
            THIS_ACCOUNT_NAME: instance.account,
        },
    });
    return container;
}

function createFargateService(
    stack: Stack,
    cluster: ecs.Cluster,
    ec2_sg_fargate: ec2.SecurityGroup,
    subnet_group_name: string,
) {
    const fargate = new ecs.FargateService(stack, `ecs-fargate-service-steampipe`, {
        cluster: cluster,
        serviceName: `ecs-fargate-service-steampipe`,
        taskDefinition: taskDefinition,
        propagateTags: ecs.PropagatedTagSource.TASK_DEFINITION,
        securityGroups: [ec2_sg_fargate],
        vpcSubnets: { subnetGroupName: subnet_group_name },
        healthCheckGracePeriod: Duration.seconds(300),
        enableExecuteCommand: true,
        desiredCount: 1,
    });

    return fargate;
}

export function GetSteampipeStackExportKey(accountName: string) {
    return `${accountName.replace('-', '')}steampipelambdaname`;
}

function setAutoscailing(fargate: ecs.FargateService) {
    const autoscailing = fargate.autoScaleTaskCount({
        minCapacity: 1,
        maxCapacity: 5,
    });
    autoscailing.scaleOnMemoryUtilization('memoryScaling', {
        targetUtilizationPercent: 80,
    });
    autoscailing.scaleOnCpuUtilization('cpuScaling', {
        targetUtilizationPercent: 80,
    });
}
