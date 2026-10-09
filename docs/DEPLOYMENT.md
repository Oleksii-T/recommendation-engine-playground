# Deployment with PM2 and Nginx

This app builds to `dist/` and uses Vue Router history mode. The included
[ecosystem.config.js](../ecosystem.config.js) uses PM2's built-in static server
with SPA fallback, so refreshing `/players/<id>/simulation` returns `index.html`.
The project directory is resolved from the ecosystem file, so there is no local
Mac path to replace. This setup serves the app at the root of its own domain.

Run these commands **on the server**, from the deployed project directory:

```sh
npm ci --include=dev
npm run build
pm2 start ecosystem.config.js --only recommendation-playground
pm2 save
```

PM2 serves `dist/` at `127.0.0.1:8181`. If this port is already in use, change
`PM2_SERVE_PORT` in the ecosystem file and the matching Nginx `proxy_pass` port.
You can also copy the app entry into your existing ecosystem; set its `cwd`
and `PM2_SERVE_PATH` to this project's absolute directory and `dist` directory.

Use [deploy/nginx.conf](../deploy/nginx.conf) as the virtual host configuration,
replacing `playground.example.com` with your domain. If your domain already has
an HTTPS server block, add the `location /` block there and retain your existing
certificate and HTTPS directives. The included whole server block is an HTTP
example; HTTPS follows your existing server setup.

For a new site on Debian/Ubuntu, copy the edited file to
`/etc/nginx/sites-available/recommendation-playground`, then enable and validate it:

```sh
sudo ln -s /etc/nginx/sites-available/recommendation-playground /etc/nginx/sites-enabled/recommendation-playground
sudo nginx -t
sudo systemctl reload nginx
```

Run the reload only if `nginx -t` succeeds. Servers using `conf.d` instead of
`sites-enabled` should place the edited file in their included `conf.d` directory.

Check the PM2 server and the public route:

```sh
pm2 status recommendation-playground
curl -I http://127.0.0.1:8181/players
curl -I https://YOUR_DOMAIN/players
```

Both routes should return HTTP 200. Open a player page, reload its Simulation
URL, and confirm it still opens correctly. Players and simulations are stored
in each browser's localStorage; deployment does not create shared server data.
Use Export JSON and Import to move your localhost data to the new domain.

For later deployments, update the code and rebuild, then restart only this app:

```sh
npm ci --include=dev
npm run build
pm2 restart ecosystem.config.js --only recommendation-playground --update-env
pm2 save
```

The server's existing PM2 startup integration should restore this saved process
on reboot. If startup integration has not been configured, run `pm2 startup`
and follow the command it prints for your server.

References: [PM2 static serving and SPA fallback](https://pm2.keymetrics.io/docs/usage/expose/),
[PM2 static server host option](https://github.com/Unitech/pm2/blob/master/lib/API/Serve.js),
[Nginx proxy directives](https://nginx.org/en/docs/http/ngx_http_proxy_module.html).
