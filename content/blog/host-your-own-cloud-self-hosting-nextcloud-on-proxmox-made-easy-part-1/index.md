+++
title = 'Nextcloud: The Ultimate Guide to Self-Hosting on Proxmox with Nginx [Part 1]'
date = 2025-07-11T11:29:03Z
draft = false
tags = ["nextcloud", "proxmox", "linux", "self-hosting", 'open-source', "nginx"]
description = "In this guide, I’ll show you how to set up Nextcloud  inside a Proxmox container and access it easily from your local network via a web interface."
type = "post"
+++

# Motivation

In a world full of data leaks and privacy breaches, protecting your personal data has never been more important. Hosting your own Nextcloud instance gives you full control over your digital life — your files, calendars, contacts, and even your passwords — all stored securely on your own terms.<br>
And most importantly, it's a great way to learn something new — from Linux basics, over containers to server management.
<br>
This guide will show you how to set up your own secure, private Nextcloud server with the LEMP-Stack<sup><a href="#fn1">1</a></sup> — giving you full control over your data and privacy. And trust me, once it’s set up, you won’t want to go back.

# Prerequisites

Before you start setting up Nextcloud on a dedicated container on Proxmox with Nginx, make sure you have the following:

&#8226; A running Proxmox VE server. Don't have one? [Start here.]()<br>
&#8226; Basic knowledge of Linux commands. [Master the essentials.]()<br>
&#8226; Storage configured so your container can use it. [Set it up quick and easily.]()<br>

# Create container

When logged in on the Proxmox Web-Interface click `Create CT`. This opens a multi-step form to create a new LXC (Linux Container).

Choose a `hostname` and a `password`. Make sure `Unprivileged container`<sup><a href="#fn2">2</a></sup> and `Nesting`<sup><a href="#fn3">3</a></sup> are both checked.

### Add SSH public-key (recommended)

You can optionally add a public SSH key to enable easy access to the container from your local terminal (bash, git-bash), avoiding the need to use the Proxmox web interface after setup.

If you don't have one just create one on inside your local terminal real quick:

```bash {lang=bash}
ssh-keygen -t rsa -b 4096 -C "youremail@example.com"
```

Print the content of your public key and copy it to your clipboard. This example assumes your key is named `id_rsa`:

```bash {lang=bash}
cat ~/.ssh/id_rsa.pub
```

Paste your public key into the `SSH public key(s)` field in the Proxmox web interface.

### Template

Next, choose a template. I recommend Debian since it tends to have fewer frequent updates compared to Ubuntu, making it more stable for your Nextcloud container.
<br> Don't have a pool of templates to select from? You can download a template inside the web interface under your `local disk`<sup><a href="#fn3">3</a></sup>.

### Resources

For running your Nextcloud container, the question arises: how should you allocate the resources? Well, it really depends on your expected usage. How many users will access and use the cloud service? How big are the files? Which plugins do you plan to install? And so on.

From a beginner point of view, I would go with the following settings:

&#8226; **Storage**: 50-100 GB (or even much more)<br>
&#8226; **Template**: Debian 12 (Bookworm)<br>
&#8226; **RAM**: (at least) 2 GB<br>
&#8226; **SWAP**: 512 MB (a good starting point, you can increase it later if needed)<br>
&#8226; **CPU Cores**: 2<br>

### Network

Here it is really important to configure the IP addresses the right way. The bridge is selected by default, so your LXC will get its own IP address on the network.

Select an IP address for your LXC and don't forget to include the subnet, like `192.168.1.77/24`

Your local network IP can be in any of these private ranges (`192.168.x.x`, `10.x.x.x`, `172.16.x.x` to `172.31.x.x`), depending on how your router or network settings. So just login to your router, verify and choose an IP that is not in use.

Next type in the IP of your gateway (normally your routers IP). For IPv6: You can let your Proxmox server and router manage the settings automatically by setting it to DHCP.

### DNS

Just use the host settings (default).

Click on `Confirm`, review the settings, check `Start after created,` and then click `Finish`.
Depending on your hardware, after a short while you’ll see the output `OK`.
<br> Great! Now it’s time to log in to the container and start working.

## Configure container

After setting up your SSH key as described above, you can connect to your newly created container.
Open your local terminal and make sure to replace the IP address with the actual IP of your Nextcloud container:

```bash {lang=bash}
ssh root@192.168.1.77
```

Alternatively, you can click on the container in the sidebar of the Proxmox web interface, open the `>_ Console`, and log in there.

Make a quick check if your container can communicate with the world wide web:

```bash {lang=bash}
ping -c 5 1.1.1.1
```

This will send 5 ICMP echo requests to a Cloudflare DNS and then stop automatically. If there is no packet loss, your connection is stable and you can proceed. Otherwise, troubleshoot by verifying your container settings and that the container’s IP address is correct.

### Update and upgrade all packages

Updating right after creation ensures your container runs the latest, safest, and most stable software versions. We use `apt`<sup><a href="#fn5">5</a></sup>:

```bash {lang=bash}
apt update -y && apt upgrade -y
```

### Create a dedicated user

For improved security, better isolation and easier auditing we don't want to continue as `root` user because its more likely then to break our system. So just create a user with sudo-privileges by adding him to the sudo group:

```bash {lang=bash}
adduser nextcloud && usermod -aG sudo nextcloud
```

Now copy your local SSH key that you created earlier to the remote machine for accessing it with SSH.
Therefore exit the SSH session with the command `exit`.

Transfer the public key from your local terminal to the container:

```bash {lang=bash}
ssh-copy-id -i ~/.ssh/id_rsa nextcloud@192.168.1.77
```

This example assumes your key is named `id_rsa`. The command is smart enough to figure out that your public key ends with `.pub`. Don’t forget to replace the IP with your own container’s IP address.

Now you can login to your container with `root` (if necessary) and your `nextcloud` user.

Connect via SSH with `nextcloud` user and proceed with the installation of all necessary software.

### Add Mount Point

Mount Points allow you to attach a dedicated directory or disk to your container. This separates your Nextcloud data from the container’s base system, making upgrades, backups, migrations and maintenance much easier.

On your LXC create a folder for your data. The path is up to you:

```bash {lang=bash}
mkdir /mnt/hdd
```

Now shut the container down:

```bash {lang=bash}
shutdown -h now
```

Inside the GUI of Proxmox switch to the `Resources` settings of the LXC then click `Add` and `Mount Point`.

Choose a storage, how much data your Mount Point should hold (disk size) and type in the path from above: `/mnt/hdd`.
Now start your container again.

Make sure your hdd is listed in your container drives:

```bash {lang=bash}
df -h
```

## Install software

In this section, we get to the heart of the installation. We’ll configure the web server, set up the database, and download Nextcloud. Let’s finish what we started!

### Nginx

Nextcloud officially supports Apache as webserver, but Nginx works smoothly if set up correctly.
Nginx is faster, lighter, and handles more traffic efficiently, but you need to configure some things manually.
Apache may be easier to setup out of the box, but Nginx definitely performs better.

So to install it, simply run:

```bash {lang=bash}
sudo apt update -y && sudo apt install nginx -y
```

### Enable firewall with UFW

Enable firewall and add a rule for Nginx

```bash {lang=bash}
ufw enable && ufw allow 'Nginx HTTP'
```

Verify that UFW only allows incoming traffic on port 80 over http (we'll optimize that later):

```bash {lang=bash}
sudo ufw status
```

### Install database

We'll use an open-source database called MariaDB with version `10.11`. <br>

<div class="msg warning">
Never pick versions arbitrarily — always check Nextcloud’s official documentation to find the compatible PHP and database versions.
</div>

Download this bash script to a temporary location to add and configure the MariaDB repository: <br>

```bash {lang=bash}
cd /tmp && wget https://downloads.mariadb.com/MariaDB/mariadb_repo_setup
```

Make the script executable and run it:

```bash {lang=bash}
chmod a+x mariadb_repo_setup && sudo ./mariadb_repo_setup --mariadb-server-version="mariadb-10.11"
```

Now remove the script because it's no longer needed and install MariaDB:

```bash {lang=bash}
rm -rf mariadb_repo_setup && sudo apt install -y mariadb-server`
```

Make sure that the version is really `10.11`:

```bash {lang=bash}
mariadb --version
```

The MariaDB-service should be running you can check with:

```bash {lang=bash}
service mariadb status
```

Login into the database and change the root password of MariaDB. Always take time to set a secure password:

```bash {lang=bash}
mariadb -u root && ALTER USER root@localhost IDENTIFIED BY 'changeme!';
```

Now exit MariaDB simply with:

```bash {lang=bash}
exit
```

### Setup database

Login into the database with your new password:

```bash {lang=bash}
mariadb -u root -p
```

Now create a database called `nextcloud` and add a new user with the same name. We'll give that user full access to all the tables inside that database, so choose a secure password:

```bash {lang=bash}
CREATE DATABASE nextcloud
CREATE USER 'nextcloud'@'localhost' IDENTIFIED BY 'CHANGEME!'
GRANT ALL on nextcloud.* TO 'nextcloud'@'localhost' IDENTIFIED BY 'CHANGEME!' WITH GRANT OPTION
```

After changing the password, execute the statements by writing `;` and hit `Enter`. <br>
Type `EXIT` again.
Done!

<div class="msg dyn">
If you're using CREATE USER and GRANT statements in MariaDB, you don't need to FLUSH PRIVILEGES, because these commands automatically update the internal privilege tables and reload them immediately.
</div>

## Install PHP

Nextcloud relies on PHP as its backend language, so the PHP runtime must be installed to execute its server-side code.

We need to install a bunch of packages:

```bash {lang=bash}
apt install php8.3 php8.3-fpm php8.3-mysql php-common php8.3-cli php8.3-common php8.3-json php8.3-opcache php8.3-readline php8.3-mbstring php8.3-xml php8.3-gd php8.3-curl php-imagick php8.3-zip php8.3-xml php8.3-bz2 php8.3-intl php8.3-bcmath php8.3-gmp
```

One of the most important packages is `php-fpm`. It's a server-side daemon that manages a pool of worker processes to efficiently handle multiple PHP requests in parallel, improving performance and scalability for web applications.

Now start the fpm-service and enable it on startup:

```bash {lang=bash}
sudo systemctl start php8.3-fpm && sudo systemctl enable php8.3-fpm
```

### Optimize PHP

To enhance both the performance and security of your server’s PHP installation, you need to configure the `php.ini` file.

You can use any text editor you prefer, such as nano or vim.
I personally choose vim because it’s a powerful tool — once mastered, it offers a fast and efficient editing experience. If you want to dive into it, [check out this post.]()

Open the file with:

```bash {lang=bash}
vim /etc/php/8.3/fpm/php.ini
```

It really depends on your specific needs, but as a solid starting point, I recommend the following settings:

### Resource limits

```bash {lang=bash}
memory_limit = 512M
upload_max_filesize = 50G ; Maximum size of an uploaded file
post_max_size = 50G ; Maximum data size of a POST request. Should be >= to upload_max_filesize
max_execution_time = 3600 ; Time allowed to receive and parse incoming data (like file uploads)
max_input_time = 3600 ; Time allowed for the PHP script to run after data is received.
```

### Error handling

```bash {lang=bash}
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT
display_errors = Off ; Hides PHP error messages from users to protect sensitive info
log_errors = On
error_log = /var/log/php_errors.log
```

### Other

```bash {lang=bash}
date.timezone = Europe/Berlin ; depends on your server location
```

### Enable OPCache

Drastically improves PHP performance. Normally, when PHP runs a script, it parses and compiles it into bytecode every single time. OPcache skips that by caching the compiled version.

```bash {lang=bash}
opcache.enable = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 8
opcache.max_accelerated_files = 10000
opcache.revalidate_freq = 1
opcache.validate_timestamps = 1
```

### Security

This setting makes sure PHP only runs real script files, not guessed ones — which helps keep your server safe, especially with Nginx.

```bash {lang=bash}
cgi.fix_pathinfo = 0
```

After making your changes, press `Esc` to change to Normal mode, then type `:wq` to save and exit the vim-editor.

<hr>

<small id="fn1"><sup>1</sup>The LEMP-Stack is a set of open-source software — Linux, Nginx (pronounced "Engine-X"), MariaDB (a MySQL-compatible database), and PHP. All used together to serve dynamic websites and web applications.</small>

<small id="fn2"><sup>2</sup> This means that even if a process runs as root inside the container, it doesn't have root privileges on the Proxmox host, which helps prevent security breaches.</small>
<br>
<small id="fn3"><sup>3</sup>
This lets your container handle more complex workloads and services by allowing certain privileged operations safely inside the container.</small>

<small id="fn4"><sup>4</sup>
For example, if your server is called `server`, go to `local (server)` inside the sidebar and then click on `CT templates`.
</small>

<small id="fn5"><sup>5</sup>
Debian-based containers use apt; other templates may use different package managers.
</small>

```

```
