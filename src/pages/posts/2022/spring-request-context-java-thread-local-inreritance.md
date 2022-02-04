---
setup: |
  import Layout from '../../../layouts/BlogPost.astro'
title: Spring RequestContextHolder and Thread Local Inheritance
publishDate: '2022-02-03'
description: Spring allows exposing HTTP request-related data outside of the Controller class with the help of a thread-bound RequestAttributes object. But real-world applications do not process the request with a single thread. Can we use RequestAttributes with code that is running inside the thread pool?
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
ogTitle: How RequestContextHolder works and how we can use it together with Thread Pools.
---

## Overview

In this post, I would like to share my investigation of the RequestContextHolder logic.

The library developed by another team did not work as expected in our REST API microservice. After the source code investigation, we realized that the problem is related to the RequestContextHolder. The library relies on RequestContextHolder to get HTTP request-related information, and implementation uses thread-local variables. So it will work well when we have just one thread that processes the request end to end. But in our microservice, we use separate Thread Pools for Spring service beans with set-up timeouts and rate limiters. Can we still use the library as it is and tune our microservice?

The complete source code for fragments below is available [on GitHub](https://github.com/AnyRoad/sandbox/tree/main/inheritable-thread-local/src).

## Spring MVC RequestContextHolder

### Starting Investigation

[Spring Docs](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/context/request/RequestContextHolder.html)

> RequestContextHolder is holder class to expose the web request in the form of a thread-bound RequestAttributes object.

So you can get information about web requests in any place in the code:

```java
ServletRequestAttributes requestAttributes =
        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
HttpServletRequest servletRequest = requestAttributes.getRequest();
servletRequest.getHeader("my-header");
servletRequest.getCookies();
```

`RequestContextHolder` uses `ThreadLocal` and `InheritableThreadLocal` to store the value associated with each thread separately. Based on the `inheritable` flag, the class uses one or another.

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

Let's look at the Java Doc again:

> The request will be inherited by any child threads spawned by the current thread if the **inheritable flag** is set to true.

The flag is a member of the parent `DispatcherServlet` class. We can set it directly on the bean of DispatcherServlet:

```java
ConfigurableApplicationContext context = SpringApplication.run(Application.class, args);
DispatcherServlet dispatcherServlet = context.getBean(DispatcherServlet.class);
dispatcherServlet.setThreadContextInheritable(true);
```

`setThreadContextInheritable` seems just like what we need. But would this implementation inherit the ThreadLocal values for a real-world environment where we don't create thread directly but re-use threads provided by Thread Pools?

### Tests

For the test, let's create a simple controller which sets Attribute and tries to read its value in child Thread. For each HTTP request Attribute, we set the value incrementing `AtomicInteger`, so it will never be the same.

```java:Controller.java
public class ControllerResult {
    private int parentThreadValue;
    private int childThreadValue;
    private boolean childThreadHasSameRequestAttributes;
    private boolean success;
    private String execptionMessage;
}

@RestController
public abstract class Controller {
  private final static String ATTRIBUTE_NAME = "incremented number";
  private final static int SCOPE = RequestAttributes.SCOPE_REQUEST;

  private final Executor threadPool;
  private final AtomicInteger counter = new AtomicInteger(0);

  public Controller(Executor threadPool) {
      this.threadPool = threadPool;
  }

  @GetMapping("/one-level-child-thread")
  public ControllerResult oneLevel() throws ExecutionException, InterruptedException {
      RequestAttributes originalRequestAttributes = getRequestAttributes();
      int counterValue = counter.incrementAndGet();

      originalRequestAttributes.setAttribute(ATTRIBUTE_NAME, counterValue, SCOPE);
      counterValue = (int) originalRequestAttributes.getAttribute(ATTRIBUTE_NAME, SCOPE);

      CompletableFuture<RequestAttributes> requestFuture =
              CompletableFuture.supplyAsync(this::getRequestAttributes, threadPool);

      return buildResponse(requestFuture, counterValue, originalRequestAttributes);
  }

  private ControllerResult buildResponse(CompletableFuture<RequestAttributes> requestFuture,
                                         int counterValue,
                                         RequestAttributes originalRequestAttributes)
                                    throws ExecutionException, InterruptedException {
    RequestAttributes inheritedRequestAttributes = requestFuture.get();

    int attribute;
    try {
      attribute = (int) inheritedRequestAttributes.getAttribute(ATTRIBUTE_NAME, SCOPE);
    } catch (Exception ex) {
      return ControllerResult.builder()
          .success(false)
          .execptionMessage(ex.getMessage())
          .build();
    }
    return ControllerResult.builder()
        .success(true)
        .parentThreadValue(counterValue)
        .childThreadValue(attribute)
        .childThreadHasSameRequestAttributes(originalRequestAttributes == inheritedRequestAttributes)
        .build();
    }
}
```

And then let's create a simple test that verifies that value is the same only two first times for the Thread Pool, which has at most two threads, and all further requests do not get the updated value.

```java:InheritableThreadLocalInheritableTest.java
@SpringBootTest(classes = {
        ReleaseVersionApp.class
}, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "threadContextInheritable=true")
class InheritableThreadLocalInheritableTest extends BaseMvcTest {

  @Test
  public void shouldInheritThreadLocalOnly2Times() {
      for (int i = 1; i <= 2; ++i) {
          ControllerResult response = callApi("/one-level-child-thread");
          assertTrue(response.isSuccess());
      }
      // after both threads are created values is not updated anymore and original Request in the
      // Context is not valid
      for (int i = 1; i <= 2; ++i) {
          ControllerResult response = callApi("/one-level-child-thread");
          assertFalse(response.isSuccess());
      }
  }
}
```

The test succeeds, which means that `RequestContextHolder` does not work well with Thread Pool.

Now let's look at how InheritableThreadLocal works.

## InheritableThreadLocal

### Dive deep in code

Each Java `Thread` has two variables - `threadLocals` and `inheritableThreadLocals`:

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

ThreadLocalMap is a special implementation of `Hash Map` where the key is `ThreadLocal<?> k` and value is `Object v` designed only for the ThreadLocal. It does not follow the same collision resolution technique as the `HashMap` but simply puts value on the next available slot.
How we can get and set ThreadLocal value for the current thread?

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

Both methods first get the `ThreadLocalMap` for the current thread and then get the value based on `this` as ThreadLocal. The only difference is how we get the `ThreadLocalMap`:

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

Now let's find how `inheritThreadLocals` is created. The Constructor of the `Thread` class has the `inheritThreadLocals` parameter which is `true` by default for public constructors:

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

When `inheritThreadLocals` is true, constructor creates the `inheritableThreadLocals` based on the values of the `parent` (current) thread. It means that the thread copies the **`inheritableThreadLocals` value only one time and never syncs `inheritableThreadLocals` back with parent thread**. Because of that, changes in the parent thread `inheritableThreadLocals` are not reflected. But `ThreadLocal.createInheritedMap` **does not perform "deep copy"**, so changes in the ThreadLocal values themselves will be visible to the child Thread.

Based on the source code analysis, `InheritableThreadLocal` will not work well with Thread Pools, where we do not create a thread every time and can re-use the thread for the next task.

### Tests

Now let's verify our findings with unit tests.

```java:InheritedThreadLocalTest.java
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

We create a single-thread Thread Pool so at most one thread should be created. Then we submit first Runnable and wait until it will finish. In that Runnable, we get ThreadLocal value and save it in the `dataFromChildThread`. Thread Pool creates a new thread and copies the `inheritableThreadLocals` from the parent thread.
Then we change ThreadLocal value and submit the second Runnable which has the same logic. This time no new Thread will be created and the Thread Pool will re-use the existing Thread. If `InheritableThreadLocal` can refresh the value each time we would see updated value from the second Runnable. But the test succeeded and it means that we still got the original data we saw in the first Runnable.
Also, let's verify if the child thread can get updated value inside the Object stored in ThreadLocal (because child thread doesn't do deep copy for the `inheritableThreadLocal`):

```java:InheritedThreadLocalTest.java
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

We use to control data flow and wait until the thread starts.
Then we modify data inside the `threadLocalData` and release the second CountDownLatch which is used to suspend child Thread until we update the value.

As expected child thread can see the updated value.

How can we overcome the `InheritableThreadLocal` limitation? We can use a library developed in Alibaba.

## Transmittable Thread Local

[GitHub Page](https://github.com/alibaba/transmittable-thread-local/blob/master/README-EN.md)

> TransmittableThreadLocal(TTL): The missing Java™ std lib(simple & 0-dependency) for framework/middleware, provide an enhanced InheritableThreadLocal that transmits values between threads even using thread pooling components.

Library provides three ways to transmit value, even using a thread pool:

### 1. Decorate Runnable and Callable

Decorate input `Runnable` and `Callable` by `TtlRunnable` and `TtlCallable`. Each time we create `Runnable` or `Callable`, we need to decorate it. `TtlRunnable` wrapper captures values on its creation and wraps the `run` method. First, it updates thread local values with captured data, runs original `Runnable` logic, and finally restores original thread local values:

```java:TtlRunnable.java
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

Example of wrapping:

```java
Runnable ttlRunnable = TtlRunnable.get(runnable);
```

### 2. Decorate thread pool

Instead of decorating `Runnable` or `Callable`, we can decorate the Thread Pool itself only one time when we create it - the wrapper will automatically instantiate the `TtlRunnable`.:

```java:ExecutorTtlWrapper.java
@Override
public void execute(@NonNull Runnable command) {
  executor.execute(TtlRunnable.get(command, false, idempotent));
}
```

Example of wrapping:

```java
TtlExecutors.getTtlExecutorService(Executors.newFixedThreadPool(2));
```

### 3. Use Java Agent to decorate thread pool implementation class

In this approach, no decoration needed, and you have to only add `-javaagent:path/to/transmittable-thread-local-2.x.y.jar` to the Java command options.

### Test

Let's do the same test as we did with `InheritableThreadLocal`:

```java:TransmittableThreadLocalTest.java
@Test
@DisplayName("Second runnable submitted to Thread Pool gets updated value")
public void transmittableThreadLocalWithThreadPoolSecondRunnable()
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
Everything works as expected.

## Integrating Transmittable Thread Local to Spring

Unfortunately, `RequestContextHolder` has only static methods and is used directly in the `FrameworkServlet`, so it is not so easy to change `RequestContextHolder` logic to use `TransmittableThreadLocal`. Some methods of `FrameworkServlet` which uses `RequestContextHolder` are `protected final` (like the `processRequest()`), so we have to override higher-level methods and, in the end, will touch too many methods.

It might be more effective just to copy the whole `FrameworkServlet`, `RequestContextHolder` and `DispatcherServlet` source code and change the `NamedInheritableThreadLocal` to `TransmittableThreadLocal`.

Let's run a similar test for the updated version for the `RequestContextHolder`:

```java:TransmittableThreadLocalInheritTest.java
@SpringBootTest(classes = {
        TransmittableServletApp.class,
        TransmittableDispatcherServlet.class,
        TransmittableDispatcherServletAutoConfiguration.class
}, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = "threadContextInheritable=true")
class TransmittableThreadLocalInheritTest extends BaseMvcTest {

  @Test
  public void shouldInheritRequestContestInChildThread() {
    for (int i = 1; i <= 10; ++i) {
      ControllerResult response = callApi("/one-level-child-thread");
      assertEquals(i, response.getChildThreadValue());
      assertEquals(i, response.getParentThreadValue());
      assertTrue(response.isChildThreadHasSameRequestAttributes());
      assertTrue(response.isSuccess());
    }
  }
}
```

Now all ten requests got updated value in the RequestAttributes.

Now let's verify if logic works fine with [Spring Async MVC](https://spring.io/blog/2012/05/07/spring-mvc-3-2-preview-introducing-servlet-3-async-support). It is enabled by default in the recent Spring versions. The controller and test code are below:

```java:Controller.java
@GetMapping("/async/one-level-child-thread")
public Callable<ControllerResult> oneLevelAsync() {
  RequestAttributes originalRequestAttributes = getRequestAttributes();
  int counterValue = counter.incrementAndGet();

  originalRequestAttributes.setAttribute(ATTRIBUTE_NAME, counterValue, SCOPE);
  int counterValueFromAttributes = (int) originalRequestAttributes.getAttribute(ATTRIBUTE_NAME, SCOPE);

  return () -> {
    CompletableFuture<RequestAttributes> requestFuture =
        CompletableFuture.supplyAsync(this::getRequestAttributes, threadPool);

    return buildResponse(requestFuture, counterValueFromAttributes, originalRequestAttributes);
  };
}
```

```java:TransmittableThreadLocalInheritTest.java
 @Test
public void shouldInheritRequestContestInChildThreadAsyncResponse() {
  for (int i = 1; i <= 10; ++i) {
    ControllerResult response = callApi("/async/one-level-child-thread");
    assertEquals(i, response.getChildThreadValue());
    assertEquals(i, response.getParentThreadValue());
    assertFalse(response.isChildThreadHasSameRequestAttributes());
    assertTrue(response.isSuccess());
  }
}
```

Everything works fine as well, but there is some difference - `RequestAttributes` Object is not the same even it has the same data (`isChildThreadHasSameRequestAttributes` is `false`).

Let's look at the official Spring documentation:

> Servlet 3 web application can call request.startAsync() and use the returned AsyncContext to continue to write to the response from some other separate thread. At the same time from a client's perspective the request still looks like any other HTTP request-response interaction. It just takes longer to complete. The following is the sequence of events:
>
> 1. Client sends a request
> 2. Servlet container allocates a thread and invokes a servlet in it
> 3. The servlet calls request.startAsync(), saves the AsyncContext, and returns
> 4. The container thread is exited all the way but the response remains open
> 5. Some other thread uses the saved AsyncContext to complete the response
> 6. Client receives the response

In the middle of the data flow, Spring creates `ServletRequestAttributes` again based on the `HttpServletRequest` and `HttpServletResponse` so we don't need to wrap the `AsyncTaskExecutor`, which is used for the async processing.

GitHub code also contains similar tests for request handler, which uses two Threads, so it needs to pass RequestAttribures to the grand-child Thread.

## Conclusion

We can use the `TransmittableThreadLocal` to fix default `InheritableThreadLocal` Java implementation.

But for the Spring `RequestContextHolder`, we have to modify too much source code, which can be troublesome for a production project, and you have to do it each time you upgrade the Spring version to avoid any side effects.
It feels more reasonable to pass Request related information implicitly as method parameters if you need to use it in logic executed inside Thread Pool. When we have to use a 3rd party library in the existing application, we might consider cloning `FrameworkServlet` to avoid many changes in the code. Even in this case, we manually set RequestAttributes to the RequestContextHolder just before calling the library function.

Outside of Spring's internal usage, it works fine, and for the `Decorate thread pool` option, we don't need to do many changes, only add `TtlExecutors.getTtlExecutorService` to Thread Pool creation code.
