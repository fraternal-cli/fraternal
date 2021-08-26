# Fraternal

A framework for creating clonable project templates that still compile

## Intro

This is a proof of concept right now and will be unstable until it's first release. There will be breaking changes as it grows, but I think there is some potential here.

## Motivation

I've used [Cookiecutter](http://cookiecutter.readthedocs.io) in projects before, but it always bummed me out that when I wanted to populate variables in code the syntax would cause the template to no longer compile. This made it hard to maintain these templates as time went on. You would need to make the changes you wanted to and then clone the template to test it.

So this project has some goals as it is being built

### 1. Templates must compile

This is a huge factor for maintaining templates. You should be able to have a test suite and start the template if you want.

### 2. Template syntax must be customizable

This project is being made with Typescript templates in mind (that's like 99% of what I use) but it should be able to be used for any language.

### 3. Configuration should be painless

Besides just having a simple configuration, it should also be helpful to the developer. Someone wanting to setup a template shouldn't have to keep going back to documentation to figure out how to do something.

Currently this is achieved with a javascript file being the template, but this requires that the template has a package.json to get the typescript types. This is probably the thing that will evolve the most before version 1.
