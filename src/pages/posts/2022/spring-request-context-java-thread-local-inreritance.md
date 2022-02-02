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

## Spring MVC RequestContextHolder

[Spring Docs](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/context/request/RequestContextHolder.html)

> Holder class to expose the web request in the form of a thread-bound RequestAttributes object. The request will be inherited by any child threads spawned by the current thread if the **inheritable flag** is set to true.

So you can get information about web request in any class:

```java
ServletRequestAttributes requestAttributes =
        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
HttpServletRequest servletRequest = requestAttributes.getRequest();
servletRequest.getHeader("my-header");
servletRequest.getCookies();
```

`RequestContextHolder` uses `ThreadLocal` and `InheritableThreadLocal` to store the value associated with every thread. Based the `inheritable` flag class uses one or another.

```java:RequestContextHolder.java
public abstract class RequestContextHolder  {

  private static final ThreadLocal<RequestAttributes> requestAttributesHolder =
			new NamedThreadLocal<>("Request attributes");

  private static final ThreadLocal<RequestAttributes> inheritableRequestAttributesHolder =
			new NamedInheritableThreadLocal<>("Request context");

  public static void setRequestAttributes(@Nullable RequestAttributes attributes,
                                          boolean inheritable) {
    if (attributes == null) {
      resetRequestAttributes();
    }
    else {
      if (inheritable) {
        inheritableRequestAttributesHolder.set(attributes);
        requestAttributesHolder.remove();
      }
      else {
        requestAttributesHolder.set(attributes);
        inheritableRequestAttributesHolder.remove();
      }
    }
  }

  public static RequestAttributes getRequestAttributes() {
    RequestAttributes attributes = requestAttributesHolder.get();
    if (attributes == null) {
      attributes = inheritableRequestAttributesHolder.get();
    }
    return attributes;
  }
}
```

The flag is member of the parent `DispatcherServlet` class. It can be set directly on the bean of DispatcherServlet:

```java
ConfigurableApplicationContext context = SpringApplication.run(Application.class, args);
DispatcherServlet dispatcherServlet = context.getBean(DispatcherServlet.class);
dispatcherServlet.setThreadContextInheritable(true);
```

## InheritableThreadLocal

### Dive deep in code

Now let's look how InheritableThreadLocal works. Each Java `Thread` has two variables - `threadLocals` and `inheritableThreadLocals`:

```java:Thread.java
/* ThreadLocal values pertaining to this thread. This map is maintained
  * by the ThreadLocal class. */
ThreadLocal.ThreadLocalMap threadLocals = null;

/*
  * InheritableThreadLocal values pertaining to this thread. This map is
  * maintained by the InheritableThreadLocal class.
  */
ThreadLocal.ThreadLocalMap inheritableThreadLocals = null;
```

ThreadLocalMap is special implementation of `Hash Map` where key is `ThreadLocal<?> k` and value is `Object v` designed only for the `ThreadLocal`. It does not follow the same collision resolution technique as the HashMap but simply put value to the next available slot.

How we can get and set `ThreadLocal` value for the current thread?

```java:ThreadLocal.java
public void set(T value) {
    Thread t = Thread.currentThread();
    ThreadLocalMap map = getMap(t);
    if (map != null) {
        map.set(this, value);
    } else {
        createMap(t, value);
    }
}

public T get() {
  Thread t = Thread.currentThread();
  ThreadLocalMap map = getMap(t);
  if (map != null) {
      ThreadLocalMap.Entry e = map.getEntry(this);
      if (e != null) {
          @SuppressWarnings("unchecked")
          T result = (T)e.value;
          return result;
      }
  }
  return setInitialValue();
}
```

both methods first get the `ThreadLocalMap` for current Thread and then get the value based on `this` as `ThreadLocal`. The only one difference is how we get the `ThreadLocalMap`:

```java:InheritableThreadLocal.java
ThreadLocalMap getMap(Thread t) {
    return t.inheritableThreadLocals;
}
```

```java:ThreadLocal.java
ThreadLocalMap getMap(Thread t) {
    return t.threadLocals;
}
```

Now let's find how `inheritThreadLocals` is created. Constructor of the `Thread` class has `inheritThreadLocals` parameter which is `true` by default for public constructors:

```java:Thread.java
private Thread(ThreadGroup g, Runnable target, String name,
                   long stackSize, AccessControlContext acc,
                   boolean inheritThreadLocals) {
  //...code ommitted
  Thread parent = currentThread();
  //...code ommitted
  if (inheritThreadLocals && parent.inheritableThreadLocals != null)
            this.inheritableThreadLocals =
                ThreadLocal.createInheritedMap(parent.inheritableThreadLocals);
}

public Thread(ThreadGroup group, Runnable target, String name,
              long stackSize) {
    this(group, target, name, stackSize, null, true);
}
```

When `inheritThreadLocals` is true the `inheritableThreadLocals` is created for the new Thread based on the values of the `parent` (current) thread. It means that the **`inheritableThreadLocals` value is created only one time and Thread never syncs `inheritableThreadLocals` back with parent Thread**. Because of that changes in the parent Thread `inheritableThreadLocals` are not reflected. But `ThreadLocal.createInheritedMap` **does not perform "deep copy"** so changes in the ThreadLocal values themselves will be visible to the child Thread.

So based on the source code analysis `InheritableThreadLocal` will not work well with Thread Pools where Thread can be re-used for the next task.

### Tests

Now let's verify our findings with unit tests. Full test code can be found on [GitHub](https://github.com/AnyRoad/sandbox/blob/main/inheritable-thread-local/src/test/java/dev/anyroad/threadlocal/InheritedThreadLocalTest.java)

```java
@Test
@DisplayName("Second runnable submitted to Thread Pool does not get updated value")
public void InheritableThreadLocalWithThreadPoolSecondRunnable()
                throws InterruptedException, ExecutionException {
    ThreadLocal<String> threadLocal = new InheritableThreadLocal<>();

    String mainThreadOriginalData = "main thread";
    threadLocal.set(mainThreadOriginalData);

    ThreadLocalData dataFromChildThread = new ThreadLocalData("data");

    ExecutorService executorService = Executors.newSingleThreadExecutor();

    Future<?> firstTask = executorService.submit(() -> {
        dataFromChildThread.setData(threadLocal.get());
    });

    firstTask.get();

    assertEquals(mainThreadOriginalData, dataFromChildThread.getData());

    threadLocal.set("main new thread");

    executorService.submit(() -> dataFromChildThread.setData(threadLocal.get()));

    executorService.shutdown();
    executorService.awaitTermination(1, TimeUnit.SECONDS);

    assertEquals(mainThreadOriginalData, dataFromChildThread.getData());
}
```

We create single-thread Thread Pool so at most 1 Thread should be created. Then we submit first Runnable and wait until it will finish.
In that Runnable we get ThreadLocal value and save it in the `dataFromChildThread`.
Thread Pool creates new thread and copies the `inheritableThreadLocals` from parent thread.

Then we change ThreadLocal value and submit second Runnable which has the same logic. This time no new Thread will be created and the Thread Pool will re-use existing Thread. If `InheritableThreadLocal` can refresh the value each time we would see updated value from the second Runnable. But test successed and it means that we still got original data we saw in the first Runnable.

Also let's verify if child thread can get updated value inside the Object stored in ThreadLocal (because child thread doesn't do deep copy for InheritableThreadLocal):

```java
@Test
@DisplayName("Second runnable submitted to Thread Pool can see updates in the value itself")
public void InheritableThreadLocalWithThreadPoolSecondRunnableSeeChangesInObject()
                  throws InterruptedException {
    ThreadLocal<ThreadLocalData> threadLocal = new InheritableThreadLocal<>();

    String mainThreadData = "main thread";
    ThreadLocalData threadLocalData = new ThreadLocalData(mainThreadData);
    threadLocal.set(threadLocalData);

    AtomicReference<String> dataFromChildThread = new AtomicReference<>();

    CountDownLatch threadStartedLatch = new CountDownLatch(1);
    CountDownLatch valueChangedLatch = new CountDownLatch(1);

    Thread childThread = new Thread(() -> {
        threadStartedLatch.countDown();
        try {
            valueChangedLatch.await();
        } catch (InterruptedException e) {
            fail("Exception during latch await: " + e);
        }
        dataFromChildThread.set(threadLocal.get().getData());
    });

    childThread.start();

    threadStartedLatch.await();

    threadLocalData.setData("main new thread");
    valueChangedLatch.countDown();

    childThread.join();

    assertEquals(threadLocalData.getData(), dataFromChildThread.get());
}
```

We use [CountDownLatch](https://docs.oracle.com/javase/7/docs/api/java/util/concurrent/CountDownLatch.html) to control data flow and wait until the thread actually starts.
Then we modify data inside the `threadLocalData` and release second CountDownLatch which is used to suspend child Thread until we update the value.

As expected child thread can see updated value.

How can we overcome the InheritableThreadLocal limitation? We can use library developed in the Alibaba.

## Transmittable Thread Local

[GitHub Page](https://github.com/alibaba/transmittable-thread-local/blob/master/README-EN.md)

> TransmittableThreadLocal(TTL): The missing Java™ std lib(simple & 0-dependency) for framework/middleware, provide an enhanced InheritableThreadLocal that transmits values between threads even using thread pooling components.

Library provides 3 ways to transmit value even using thread pool:

- _Decorate Runnable and Callable_. Decorate input `Runnable` and `Callable` by `TtlRunnable` and `TtlCallable`. Each time we create `Runnable` or `Callable` we have to decorate it. `TtlRunnable` wrapper captures values on it's creation and wraps the `run` method. First it updates Thread Local values with captured data, run original `Runnable` logic and finally restored original Thread Local values:

```java
  private final AtomicReference<Object> capturedRef;
  private final Runnable runnable;
  private final boolean releaseTtlValueReferenceAfterRun;

  private TtlRunnable(@NonNull Runnable runnable, boolean releaseTtlValueReferenceAfterRun) {
    this.capturedRef = new AtomicReference<Object>(capture());
    this.runnable = runnable;
    this.releaseTtlValueReferenceAfterRun = releaseTtlValueReferenceAfterRun;
  }

  @Override
  public void run() {
    final Object captured = capturedRef.get();
    if (captured == null || releaseTtlValueReferenceAfterRun && !capturedRef.compareAndSet(captured, null)) {
      throw new IllegalStateException("TTL value reference is released after run!");
    }

    final Object backup = replay(captured);
    try {
      runnable.run();
    } finally {
      restore(backup);
    }
  }
```

- _Decorate thread pool_. Instead of decorating `Runnable` or `Callable` we can decorate Thread Pool itself only one time when we create it - wrapper will automatically create the `TtlRunnable`:
  ```java
  @Override
  public void execute(@NonNull Runnable command) {
    executor.execute(TtlRunnable.get(command, false, idempotent));
  }
  ```
- _Use Java Agent to decorate thread pool implementation class_. In this approach no decoration needed and you have to only add `-javaagent:path/to/transmittable-thread-local-2.x.y.jar` to the Java command options.

Let's do the same test as we did with `InheritableThreadLocal`:

```java
@Test
@DisplayName("Second runnable submitted to Thread Pool gets updated value")
public void InheritableThreadLocalWithThreadPoolSecondRunnable()
                throws InterruptedException, ExecutionException {
  ThreadLocal<String> threadLocal = new TransmittableThreadLocal<>();

  String mainOriginalThreadData = "main thread";
  threadLocal.set(mainOriginalThreadData);

  ThreadLocalData dataFromChildThread = new ThreadLocalData("original data");

  ExecutorService executorService =
      TtlExecutors.getTtlExecutorService(Executors.newSingleThreadExecutor());

  Future<?> future = executorService.submit(() -> {
      dataFromChildThread.setData(threadLocal.get());
  });

  future.get();

  assertEquals(mainOriginalThreadData, dataFromChildThread.getData());

  String mainNewThreadData = "main new thread";
  threadLocal.set(mainNewThreadData);

  executorService.submit(() -> dataFromChildThread.setData(threadLocal.get()));

  executorService.shutdown();
  executorService.awaitTermination(1, TimeUnit.SECONDS);

  assertEquals(mainNewThreadData, dataFromChildThread.getData());
}
```

Now second `Runnable` sumbitted to the single-thread Thread Pool got updated Thread Local value.
Everything works as expected. Full test code can be found on [GitHub](https://github.com/AnyRoad/sandbox/blob/main/inheritable-thread-local/src/test/java/dev/anyroad/threadlocal/TransmittableThreadLocalTest.java)

## Integratting Transmittable Thread Local to Spring
