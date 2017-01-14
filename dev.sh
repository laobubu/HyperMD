#!/bin/bash

sassWatch() {
    cd $1
    node-sass $2.scss >$2.css
    node-sass --watch --output ./ $2.scss
}

lite-dev &
sassWatch ./hypermd/mode hypermd &
sassWatch ./hypermd/theme hypermd-light &
wait
