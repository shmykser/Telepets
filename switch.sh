#!/bin/bash

if [ -z "$1" ]; then
    echo "Использование: ./switch.sh <состояние>"
    echo "Состояния: incubating, hatching, dead, hatched"
    echo ""
    echo "Примеры:"
    echo "  ./switch.sh incubating"
    echo "  ./switch.sh hatching"
    echo "  ./switch.sh dead"
    echo "  ./switch.sh hatched"
    exit 1
fi

python quick_switch.py "$1" 