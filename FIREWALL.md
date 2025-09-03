# Firewall Configuration

## Docker

Since Docker adds IP Tables rules for container port mappings,
ufw rules added through the ufw CLI have no effect to the ports of Docker containers.

Add the following section at the end of `/etc/ufw/after.rules`, but before the `COMMIT` line to block access to Docker container ports:

```text
# for docker blocking
:ufw-user-forward - [0:0]
:DOCKER - [0:0]

# block new connections from the internet
-A DOCKER -m conntrack --ctstate NEW -i eth0 -j DROP

# allow the rest through
-A DOCKER -j RETURN

# end docker rules
```

To open individual Docker ports to the internet, add before the `# block new connections from the internet` line:

```text
# open traefik to the internet
-A DOCKER -m conntrack --ctstate NEW -p tcp --dport 80  -i eth0 -j RETURN
-A DOCKER -m conntrack --ctstate NEW -p tcp --dport 443 -i eth0 -j RETURN
```
