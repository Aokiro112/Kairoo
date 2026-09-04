FROM alpine:3.21

LABEL maintainer="Kairo Security Engine"
LABEL description="Dedicated security container with Nmap, Subfinder, HTTPX, Wafw00f, Nuclei, and Semgrep"

# 1. Install base utilities, network tools, python, and compilers
RUN apk add --no-cache \
    nmap \
    nmap-scripts \
    bind-tools \
    curl \
    git \
    python3 \
    py3-pip \
    sslscan \
    whois \
    ca-certificates \
    bash \
    jq

# 2. Install ProjectDiscovery Go tools (subfinder, httpx, nuclei)
RUN apk add --no-cache --virtual .build-deps go && \
    export GOPATH=/root/go && \
    export PATH=$PATH:$GOPATH/bin && \
    go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && \
    go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest && \
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && \
    mv $GOPATH/bin/* /usr/local/bin/ && \
    rm -rf /root/go /root/.cache && \
    apk del .build-deps

# 3. Install Python tools (wafw00f, semgrep) with break-system-packages flag
RUN pip3 install --no-cache-dir --break-system-packages wafw00f semgrep

WORKDIR /workspace

# Keep container alive when run as a standing service
CMD ["tail", "-f", "/dev/null"]
