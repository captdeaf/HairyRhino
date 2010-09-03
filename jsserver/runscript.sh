#!/bin/bash
#
# The only thing this does is cd into a new directory, then run a command
# given to it.

# Find out where.
where="$1"
shift

cd $where
exec $@
