---
title: Save multiline value in Etcd from CLI
postSlug: etcd-multiline-values
pubDatetime: 2022-11-05
description: Official documentation only has basic example for saving short value so it might be confusing to find a way to save long multiline value. Let's find out how we can do it.
tags:
  - etcd
  - cli
  - etcdctl
  - put
  - value
  - multiline
ogImage: ''
featured: false
draft: false
---

Etcd is a distributed consistent key-value storage [similar](https://etcd.io/docs/v3.5/learning/why/#comparison-chart) to ZooKeeper and Consul.

Unfortunately, I couldn't find a good GUI client, so I usually use the official CLI tool `etcdctl`. Here is a simple example of how to use it: [official doc](https://etcd.io/docs/v3.5/tutorials/how-to-access-etcd/)

It is straightforward and works well, but there is no example of how we can save multiline values (e.g., if we want to save JSON or YAML content). Fortunately, `etcdctl` [documentation in GitHub](https://github.com/etcd-io/etcd/tree/main/etcdctl#remarks) provides more clarification:

> If &lt;value&gt; isn't given as command line argument, this command tries to read the value from standard input.

> A &lt;value&gt; can have multiple lines or spaces but it must be provided with a double-quote as demonstrated below:

So we can use the `etcdctl put key_name` without providing the value. Then type the value, press `Enter` to start a new line, and `Ctrl-d` at the end. Or use `etcdctl put key_name < file.json` to save the content of the `file.json`. Another approach is to begin with `etcdctl put key_name "first line`, input value including new lines, and type a double quote at the end.
