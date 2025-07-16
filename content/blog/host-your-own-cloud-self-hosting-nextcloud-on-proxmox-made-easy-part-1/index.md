+++
title = 'Nextcloud: The Ultimate Guide to Self-Hosting on Proxmox with Nginx [Part 1]'
date = 2025-07-11T11:29:03Z
draft = false
tags = ["nextcloud", "proxmox", "linux", "self-hosting", 'open-source', "nginx"]
description = "In this guide, I’ll show you how to set up Nextcloud inside a Proxmox container and access it easily from your local network via a web interface."
type = "post"
+++

# Motivation

In a world full of data leaks and privacy breaches, protecting your personal data has never been more important. Hosting your own Nextcloud instance gives you full control over your digital life — your files, calendars, contacts, and even your passwords — all stored securely on your own terms.<br>
And most importantly, it's a great way to learn something new — from Linux basics, over containers to server management.
<br>
This guide will show you how to set up your own secure, private Nextcloud server—giving you full control over your data and privacy. And trust me, once it’s set up, you won’t want to go back.

# Prerequisites

Before you start setting up Nextcloud on a dedicated container on Proxmox with Nginx, make sure you have the following:

&#8226; A running Proxmox VE server. Don't have one? [Start here.]()<br>
&#8226; Basic knowledge of Linux commands. [Master the essentials.]()<br>
&#8226; Storage configured so your container can use it. [Set it up quick and easily.]()<br>

# Create container

When logged in on the Proxmox Web-Interface click `Create CT`. This opens a multi-step form to create a new LXC (Linux Container).

Choose a `hostname` and a `password`. Make sure `Unprivileged container`<sup><a href="#fn1">1</a></sup> and `Nesting`<sup><a href="#fn2">2</a></sup> are both checked.

#### Add SSH public-key (recommended)

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

Click on Confirm, review the settings, check `Start after created,` and then click `Finish`.
Depending on your hardware, after a short while you’ll see the output `OK`.
<br> Great! Now it’s time to log in to the container and start working.

## Manage container

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

Updating right after creation ensures your container runs the latest, safest, and most stable software versions. We use `apt`<sup><a href="#fn4">4</a></sup>:

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

## Install software

<hr>

<small id="fn1"><sup>1</sup> This means that even if a process runs as root inside the container, it doesn't have root privileges on the Proxmox host, which helps prevent security breaches.</small>
<br>
<small id="fn2"><sup>2</sup>
This lets your container handle more complex workloads and services by allowing certain privileged operations safely inside the container.</small>

<small id="fn3"><sup>3</sup>
For example, if your server is called `server`, go to `local (server)` inside the sidebar and then click on `CT templates`.
</small>

<small id="fn4"><sup>4</sup>
Debian-based containers use apt; other templates may use different package managers.
</small>
