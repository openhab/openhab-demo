# openHAB Demo Server

This is the home of the openHAB demo server: [demo.openhab.org](https://demo.openhab.org)

## Architecture

The openHAB demo server is deployed with Docker Compose.
In fact, _the_ demo server actually consists of two openHAB installations:

- the public openHAB instance on port `8080`
- a private openHAB instance on port `18080` used for hiding API keys from the public

Those two instances are connected over Docker internal networking through the remote openHAB binding.

### Credentials

- public openHAB: `demo:demo`
- private openHAB: `private:private`

> [!NOTE]  
> The credentials allow admin access to the Main UI, but modifications are blocked through a reverse proxy configuration.
> When attempting to modify the configuration, basic authentication enforces additional authorization.

### Deployment

Run the following command to start the demo server:

```shell
docker compose up -d
```

## Configuration

The openHAB servers used for the demo are configured through configuration files only.
This allows easily tracking config files in Git, and even makes it possible to automatically deploy the demo from the GitHub repository.

There is only one exception allowed from that rule:
UI widgets and pages can only be configured from the UI and therefore their configuration through the UI is allowed.
