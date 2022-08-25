sed -i 's/# bearer_token = "YOUR_BEARER_TOKEN"/bearer_token  = "'"$TWITTER_TOKEN"'"/g' ~/.steampipe/config/twitter.spc

steampipe service start

psql -h localhost -p 9193 -U root -d steampipe -c "CREATE SCHEMA views"
psql -h localhost -p 9193 -U root -d steampipe -c "ALTER DEFAULT PRIVILEGES IN SCHEMA views GRANT SELECT ON TABLES TO steampipe;"
psql -h localhost -p 9193 -U root -d steampipe -c "GRANT USAGE ON SCHEMA views TO steampipe"
psql -h localhost -p 9193 -U root -d steampipe -c "SELECT schema_name FROM information_schema.schemata" | tail -n +3 |head -n -2 |  egrep -v "pg_toast|pg_catalog|public|information_schema|internal|views|steampipe" | xargs -l bash -c 'psql -h localhost -p 9193 -U root -d steampipe -c "CREATE SCHEMA view_$0"'
psql -h localhost -p 9193 -U root -d steampipe -c "SELECT schema_name FROM information_schema.schemata" | tail -n +3 |head -n -2 |  egrep -v "pg_toast|pg_catalog|public|information_schema|internal|views|steampipe" | xargs -l bash -c 'psql -h localhost -p 9193 -U root -d steampipe -c "ALTER DEFAULT PRIVILEGES IN SCHEMA view_$0 GRANT SELECT ON TABLES TO steampipe;"'
psql -h localhost -p 9193 -U root -d steampipe -c "SELECT schema_name FROM information_schema.schemata" | tail -n +3 |head -n -2 |  egrep -v "pg_toast|pg_catalog|public|information_schema|internal|views|steampipe" | xargs -l bash -c 'psql -h localhost -p 9193 -U root -d steampipe -c "GRANT USAGE ON SCHEMA view_$0 TO steampipe"'
psql -h localhost -p 9193 -U root -d steampipe -c "SELECT foreign_table_schema, foreign_table_name FROM information_schema.foreign_tables;" -A -F' ' | tail -n +2  | head -n -1 |  egrep -v "steampipe_command" | xargs -l bash -c 'psql -h localhost -p 9193 -U root -d steampipe -c "CREATE OR REPLACE VIEW view_$0.$1 AS SELECT * FROM $0.$1"'
psql -h localhost -p 9193 -U root -d steampipe -c "$STEAMPIPE_CREATE_VIEW"

steampipe service stop
steampipe service start --foreground --database-password "$POSTGRES_PASSWORD"