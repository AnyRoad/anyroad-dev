---
title: Build shadow JAR for Gradle plugin with Kotlin and Kotlin DSL.
postSlug: gradle-plugin-shadow-jar
pubDatetime: 2022-11-12
description: Let's look at the example of the Shadow Gradle plugin settings for building the Gradle plugin with package relocation.
tags:
  - kotlin
  - gradle
  - kotlin
  - dsl
  - plugin
  - shadow
  - jar
  - packages relocation
ogImage: ''
featured: false
draft: false
---

## Shadow plugin

[Shadow](https://imperceptiblethoughts.com/shadow/introduction/) Gradle plugin can help you pack all your project dependencies into a single jar file. It also can help you if you need to use your jar file in some runtime, e.g., as a Spark job or Gradle plugin. In case when your jar dependency conflicts with the dependencies provided by the runtime you can use the [Package Relocation](https://imperceptiblethoughts.com/shadow/configuration/relocation/) to modify byte code and change the package names and related import statements. E.g., the `com.fasterxml.jackson` package can become `relocated.com.fasterxml.jackson` and both original and relocated versions will be loaded by the JVM.
[The Official documentation](https://imperceptiblethoughts.com/shadow/plugins/) has examples for Java and Groovy for Gradle settings.
Let's find out how we can use it with Kotlin and Kotlin DSL for Gradle plugin packaging.

## Use Kotlin DSL

After a brief search, I found an example in the [Ktlint Gradle plugin](https://github.com/JLLeitschuh/ktlint-gradle/blob/master/plugin/build.gradle.kts). Let's take a look at the code.

First, we add new Gradle `shadowImplementation` configuration. `compileOnly` and `testImplementation` will automatically include all the dependencies from the newly created configuration:

```kotlin
plugins {
    kotlin("jvm")
    id("com.gradle.plugin-publish")
    `java-gradle-plugin`
    `maven-publish`
    id("com.github.johnrengelman.shadow")
}

val shadowImplementation by configurations.creating
configurations["compileOnly"].extendsFrom(shadowImplementation)
configurations["testImplementation"].extendsFrom(shadowImplementation)

dependencies {
    // dev dependencies which Gradle runtime will provide
    compileOnly(gradleApi())
    compileOnly(libs.ktlint.core)
    compileOnly(libs.kotlin.gradle.plugin)
    compileOnly(libs.android.gradle.plugin)
    compileOnly(kotlin("stdlib-jdk8"))

    // plugin dependecies we want to shadow
    shadowImplementation(libs.semver)
    shadowImplementation(libs.jgit)
    shadowImplementation(libs.commons.io)
    shadowImplementation(libs.slf4j.nop)
}
```

Next, configure the `relocateShadowJar` and `shadowJar` tasks to automatically relocate all the dependencies from the `shadowImplementation` configuration:

```kotlin
val relocateShadowJar = tasks.register<ConfigureShadowRelocation>("relocateShadowJar")
val shadowJarTask = tasks.named<ShadowJar>("shadowJar") {
    // Enable package relocation in resulting shadow jar
    relocateShadowJar.get().apply {
        prefix = "$pluginGroup.shadow"
        target = this@named
    }

    // run the 'relocateShadowJar' task automatically to relocate all packages from the all dependencies
    dependsOn(relocateShadowJar)
    // automatically remove all classes of dependencies that are not used by the project
    minimize()
    // remove default "-all" suffix to make shadow jar look like original one.
    archiveClassifier.set("")
    // use only the dependencies from the shadowImplementation configuration
    configurations = listOf(shadowImplementation)
}
```

Since we don't need the original `jar` file anymore let's disable the `jar` task:

```kotlin
// Disabling default jar task as it is overridden by shadowJar
tasks.named("jar").configure {
    enabled = false
}
```

Also `ktlint` plugin has optional part to check if all the dependencies are inlined into the shadow jar:

```kotlin
val ensureDependenciesAreInlined by tasks.registering {
    description = "Ensures all declared dependencies are inlined into shadowed jar"
    group = HelpTasksPlugin.HELP_GROUP
    dependsOn(tasks.shadowJar)

    doLast {
        val nonInlinedDependencies = mutableListOf<String>()
        zipTree(tasks.shadowJar.flatMap { it.archiveFile }).visit {
            if (!isDirectory) {
                val path = relativePath
                if (!path.startsWith("META-INF") &&
                    path.lastName.endsWith(".class") &&
                    !path.pathString.startsWith(
                            pluginGroup.replace(".", "/")
                        )
                ) {
                    nonInlinedDependencies.add(path.pathString)
                }
            }
        }
        if (nonInlinedDependencies.isNotEmpty()) {
            throw GradleException("Found non inlined dependencies: $nonInlinedDependencies")
        }
    }
}
tasks.named("check") {
    dependsOn(ensureDependenciesAreInlined)
}
```

Finally, we need to fix the publication settings to publish the shadow jar:

```kotlin
// Add shadow jar to the Gradle module metadata api and runtime configurations
configurations {
    artifacts {
        runtimeElements(shadowJarTask)
        apiElements(shadowJarTask)
    }
}

tasks.whenTaskAdded {
    if (name == "publishPluginJar" || name == "generateMetadataFileForPluginMavenPublication") {
        dependsOn(tasks.named("shadowJar"))
    }
}

// Need to move publishing configuration into afterEvaluate {}
// to override changes done by "com.gradle.plugin-publish" plugin in afterEvaluate {} block
// See PublishPlugin class for details
afterEvaluate {
    publishing {
        publications {
            withType<MavenPublication> {
                // Special workaround to publish shadow jar instead of normal one. Name to override peeked here:
                // https://github.com/gradle/gradle/blob/master/subprojects/plugin-development/src/main/java/org/gradle/plugin/devel/plugins/MavenPluginPublishPlugin.java#L73
                if (name == "pluginMaven") {
                    setArtifacts(
                        listOf(
                            shadowJarTask.get()
                        )
                    )
                }
            }
        }
    }
}
```
