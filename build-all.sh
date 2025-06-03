#!/bin/bash

bash -c "cd 20-alpine; sh build.sh; sh push.sh"
bash -c "cd 21-alpine; sh build.sh; sh push.sh"
bash -c "cd 22-alpine; sh build.sh; sh push.sh"
bash -c "cd 23-alpine; sh build.sh; sh push.sh"
bash -c "cd 24-alpine; sh build.sh; sh push.sh"
bash -c "cd latest; sh build.sh; sh push.sh"
