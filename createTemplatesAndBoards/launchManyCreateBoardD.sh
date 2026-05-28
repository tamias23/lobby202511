#!/bin/bash

source ~/Bureau/spyder-env/bin/activate
cd ~/Bureau/svg/python/202409

for j in `seq 0 9`
do
    var=`date +"%FT%H%M%S"`
    echo "epoch $j $var"    
    # python shapely05.py &
    python createRandomBoardThenHeuristic_B2.py $j &
done

