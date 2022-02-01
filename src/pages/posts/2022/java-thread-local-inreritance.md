---
setup: |
  import Layout from '../../../layouts/BlogPost.astro'
title: Thread Local Inheritance and Spring RequestContextHolder
publishDate: 02 Feb 2022
description: Java thread local inheritance
tags:
  [
    'java',
    'multi-threading',
    'thread local',
    'spring',
    'request context',
    'RequestContextHolder',
    'transmittable-thread-local'
  ]
---

## RequestContextHolder

https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/context/request/RequestContextHolder.html

> Holder class to expose the web request in the form of a thread-bound RequestAttributes object. The request will be inherited by any child threads spawned by the current thread if the inheritable flag is set to true.

```java:Example.java
HttpServletRequest servletRequest =
    ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
servletRequest.getHeader("my-header");
servletRequest.getCookies();
```

## Inheritable thread local

## Transmittable Thread Local

## Integratting Transmittable Thread Local to Spring

https://github.com/alibaba/transmittable-thread-local/blob/master/README-EN.md
