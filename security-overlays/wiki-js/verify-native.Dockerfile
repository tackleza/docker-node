ARG CANDIDATE_IMAGE
FROM ${CANDIDATE_IMAGE}
USER root
RUN apk add --no-cache build-base python3 py3-setuptools linux-headers git-daemon
RUN cd /wiki/node_modules/sqlite3 && \
    node /wiki/node_modules/node-gyp/bin/node-gyp.js rebuild --nodedir=/usr/local > /tmp/native-build.log 2>&1 || { tail -60 /tmp/native-build.log; exit 1; }; \
     \
    node -e 'const s=require("/wiki/node_modules/sqlite3");const d=new s.Database(":memory:");d.serialize(()=>{d.run("CREATE TABLE fixture (value TEXT)");d.run("INSERT INTO fixture VALUES (?)",["preserved"]);d.get("SELECT value FROM fixture",(e,r)=>{if(e||r.value!=="preserved")process.exit(1);d.close();console.log(JSON.stringify({tar:require("/wiki/node_modules/tar/package.json").version,sqliteSourceRebuild:true,sqliteReadWrite:true}))})})'
