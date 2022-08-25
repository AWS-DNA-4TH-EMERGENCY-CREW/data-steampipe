FROM turbot/steampipe

# Setup prerequisites (as root)
USER root:0

RUN wget https://go.dev/dl/go1.18.2.linux-amd64.tar.gz -P /tmp
RUN tar -C /usr/local -xzf /tmp/go1.18.2.linux-amd64.tar.gz

RUN apt-get update -y \
  && apt-get install -y git \
  && apt-get install -y make \
  && apt-get install -y postgresql \
  && apt-get install -y awscli

RUN wget https://go.dev/dl/go1.18.2.linux-amd64.tar.gz -P /tmp
RUN tar -C /usr/local -xzf /tmp/go1.18.2.linux-amd64.tar.gz

# Install the aws and steampipe plugins for Steampipe (as steampipe user).
USER steampipe:0
RUN  steampipe plugin install steampipe aws
RUN  steampipe plugin install steampipe
RUN  steampipe plugin install steampipe twitter

COPY run.sh /tmp/run.sh

ENTRYPOINT [""]

CMD ["sh", "/tmp/run.sh"]

