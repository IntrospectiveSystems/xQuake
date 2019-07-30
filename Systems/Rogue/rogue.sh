#!bin/bash
rm -R cache
rm -R temp
xgraph x --xGraph mb://xgraph.modulebroker.net \
        --xQuake /home/alex/xGraph \
        --xVR /home/alex/xGraph \
        --Rogue OK3 \
        --System /home/alex/xGraph/xQuake/Systems/Rogue \
        --Data /home/alex/xGraph/xQuake/Systems/Data \
        --Associate associate.json \
        --Picks /home/alex/S3/Picks \
        --Agents /home/alex/xGraph/xQuake/Agents \
        --Models /home/alex/xGraph/xVR/Archive \
        /