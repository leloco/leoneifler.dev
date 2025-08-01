+++
title = 'Nextcloud: The Ultimate Guide to Self-Hosting on Proxmox with Nginx [Part 2]'
date = 2025-07-29T08:59:12Z
draft = false
tags = ["nextcloud", "proxmox", "linux", "self-hosting", 'open-source', "nginx"]
description = "In this guide, I’ll show you how to finish the setup Nof Nextcloud inside a Proxmox container and access it easily from your local network via a web interface."
+++

### Install PHP

Nextcloud relies on PHP as its backend language, so the PHP runtime must be installed to execute its server-side code.

Official Debian and Ubuntu repositories prioritize stability, so they often provide older PHP versions and don’t include very new releases like PHP 8.3 yet. To install the latest PHP versions, you need to add a trusted third-party repository like SURY (for Debian and Ubuntu), which maintains up-to-date PHP packages. Without adding this repo, apt won’t find PHP 8.3.

So add the SURY GPG key:

```bash {lang=bash}
sudo wget -O /etc/apt/trusted.gpg.d/php.gpg https://packages.sury.org/php/apt.gpg
```

Then add the SURY repo:

```bash {lang=bash}
echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/php.list
```

Update your local package list:

```bash {lang=bash}
sudo apt update
```

We need to install a bunch of packages:

```bash {lang=bash}
sudo apt install php8.3 php8.3-fpm php8.3-mysql php-common php8.3-cli php8.3-common php8.3-opcache php8.3-readline php8.3-mbstring php8.3-xml php8.3-gd php8.3-curl php-imagick php8.3-zip php8.3-xml php8.3-bz2 php8.3-intl php8.3-bcmath php8.3-gmp
```

One of the most important packages is `php-fpm`. It's a server-side daemon that manages a pool of worker processes to efficiently handle multiple PHP requests in parallel, improving performance and scalability for web applications.

Now start the fpm-service and enable it on startup:

```bash {lang=bash}
sudo systemctl start php8.3-fpm && sudo systemctl enable php8.3-fpm
```

**Optimize PHP**

To enhance both the performance and security of your server’s PHP installation, you need to configure the `php.ini` file.

You can use any text editor you prefer, such as nano or vim.
I personally choose vim because it’s a powerful tool — once mastered, it offers a fast and efficient editing experience. If you want to dive into it, [check out this post.]()

Open the file with:

```bash {lang=bash}
sudo vim /etc/php/8.3/fpm/php.ini
```

It really depends on your specific needs, but as a solid starting point, I recommend the following settings:

**Resource limits**

```bash {lang=bash}
memory_limit = 512M
upload_max_filesize = 4G ; Maximum size of an uploaded file
post_max_size = 4G ; Maximum data size of a POST request. Should be >= to upload_max_filesize
max_execution_time = 3600 ; Time allowed to receive and parse incoming data (like file uploads)
max_input_time = 3600 ; Time allowed for the PHP script to run after data is received.
```

<div class="msg dyn">
PHP settings only affect uploads via the web interface. The Nextcloud Desktop Client avoids PHP timeouts by uploading large files in chunks over persistent connections — making it better for uploading something like a 30 GB ZIP file for instance.
</div>

**Other**

```bash {lang=bash}
date.timezone = Europe/Berlin ; depends on your server location
```

**Enable OPCache**

Drastically improves PHP performance. Normally, when PHP runs a script, it parses and compiles it into bytecode every single time. OPcache skips that by caching the compiled version.

```bash {lang=bash}
opcache.enable = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 8
opcache.max_accelerated_files = 10000
opcache.revalidate_freq = 1
opcache.validate_timestamps = 1
```

**Security**

This setting makes sure PHP only runs real script files, not guessed ones — which helps keep your server safe, especially with Nginx.

```bash {lang=bash}
cgi.fix_pathinfo = 0
```

After making your changes, press `Esc` to change to Normal mode, then type `:wq` to save and exit the vim-editor.

### Configure Nginx

Create a new Nginx config file for Nextcloud:

```bash {lang=bash}
sudo vim /etc/nginx/sites-available/nextcloud
```

This will open a new file where you can add the Nginx configuration for your Nextcloud setup.

We’ll start with a minimal HTTP-only setup where Nginx handles file routing and passes PHP requests to PHP-FPM. In the next post, we’ll explore the full architecture and I explain why this approach is useful:

```bash {lang=bash, title="/etc/nginx/sites-available/nextcloud"}
upstream php-handler {
    server unix:/run/php/php8.3-fpm.sock;
}

server {
    listen 80;

    root /var/www/nextcloud;
    index index.php index.html;
    client_max_body_size 5G ; equal to or slightly larger than post_max_size in php.ini
    fastcgi_buffers 64 4K;

    # Security headers
    add_header Referrer-Policy "no-referrer" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Download-Options "noopen" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Permitted-Cross-Domain-Policies "none" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
    add_header X-XSS-Protection "1; mode=block" always;
    fastcgi_hide_header X-Powered-By;

    # Pretty URLs and front controller
    location / {
        try_files $uri $uri/ /index.php$request_uri;
    }

    # Block sensitive paths
    location ~ ^/(?:build|tests|config|lib|3rdparty|templates|data|\.|autotest|occ|issue|indie|db_|console) {
        return 404;
    }

    # PHP handler
    location ~ \.php(?:$|/) {
        fastcgi_split_path_info ^(.+?\.php)(/.*)$;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        fastcgi_param HTTPS on;
        fastcgi_param modHeadersAvailable true;
        fastcgi_param front_controller_active true;
        fastcgi_pass php-handler;
        fastcgi_intercept_errors on;
        fastcgi_request_buffering off;
    }

    # Static files
    location ~ \.(?:css|js|svg|gif|woff2?)$ {
        try_files $uri /index.php$request_uri;
        expires 6M;
        access_log off;
    }

    # DAV client redirect
    location = / {
        if ($http_user_agent ~ ^DavClnt) {
            return 302 /remote.php/webdav/$is_args$args;
        }
    }

    # Redirect /remote
    location /remote {
        return 301 /remote.php$request_uri;
    }

    # robots.txt
    location = /robots.txt {
        allow all;
        log_not_found off;
        access_log off;
    }

    # MIME types
    include mime.types;
    types {
        text/javascript js mjs;
        application/wasm wasm;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_comp_level 4;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

Make sure the file is symlinked to `sites-enabled` so that Nginx loads the site:

```bash {lang=bash}
sudo ln -s /etc/nginx/sites-available/nextcloud /etc/nginx/sites-enabled/
```

Deactivate the `default` site to prevent conflicts and ensure your custom site configuration takes precedence:

```bash {lang=bash}
sudo rm /etc/nginx/sites-enabled/default
```

You can validate the configuration file by running:

```bash {lang=bash}
sudo nginx -t
```

If no errors occurred you can restart the Nginx service:

```bash {lang=bash}
sudo systemctl restart nginx
```

### Install Nextcloud

Now we can download the latest version of Nextcloud:

```bash {lang=bash}
cd /tmp && wget https://download.nextcloud.com/server/releases/latest.zip
```

Unzip the folder and move the folder `nextcloud` to our webserver directory:

```bash {lang=bash}
unzip latest.zip && sudo mv nextcloud /var/www
```

Make the user `www-data`<sup><a href="#fn6">6</a></sup> as owner and change the rights for the necessary directories:

```bash {lang=bash}
sudo chown -R www-data:www-data /var/www/nextcloud
```

```bash {lang=bash}
sudo chown -R www-data:www-data /mnt/hdd
```

```bash {lang=bash}
sudo chmod -R 755 /var/www/nextcloud/
```

## Login to Nextcloud

Finally, open your freshly installed Nextcloud web interface by visiting your LXC container’s IP address, e.g., `http://192.168.1.77`.

Ignore the insecure connection warning for now — we’ll secure it with an SSL certificate later.

Create an admin account with a strong password.
Change the data directory to `/mnt/hdd`(or whatever mount point you configured earlier).

For the database connection, enter your `database name`, `username`, `password`, and use `localhost:3306` as the host (because `3306` is the standard port for MariaDB).

Click `Finish` — and wait for the installation. This will take a few minutes.

That’s it! Your private Nextcloud server is now set up and running on your local network.

Congratulations! 🎉
