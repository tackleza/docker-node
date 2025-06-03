#!/bin/bash
docker pull node:24-alpine
docker build -t tackleza/node:latest .
