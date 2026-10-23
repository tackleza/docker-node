const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const storage='/usr/local/lib/node_modules/n8n/node_modules/.pnpm';const packages=fs.readdirSync(storage).filter(n=>n.startsWith('n8n-nodes-base@'));
if(packages.length!==1)throw Error('Unexpected n8n-nodes-base layout');
const file=path.join(storage,packages[0],'node_modules/n8n-nodes-base/dist/nodes/Git/Git.node.js');const old=fs.readFileSync(file,'utf8');const expected=process.env.N8N_GIT_CONSUMER_SHA;
if(!expected||crypto.createHash('sha256').update(old).digest('hex')!==expected)throw Error('Unreviewed Git.node source');
const from='(0, simple_git_1.default)(gitOptions)',to="(0, simple_git_1.default.simpleGit)({...gitOptions, allowEnvironment:['GIT_TERMINAL_PROMPT','GIT_ALLOW_PROTOCOL']})";if(old.split(from).length!==2)throw Error('Expected single Git-node factory call');
// simple-git4 exports an object; the existing TypeScript interop wrapper puts that object
// in .default. Use its named simpleGit factory; leave all n8n path/config/auth guards intact.
fs.writeFileSync(file,old.replace(from,to));console.log('Adapted one reviewed Git-node factory call for simple-git4');

const promotion='/usr/local/lib/node_modules/n8n/dist/modules/promotions.ee/promotions-git.service.js';const original=fs.readFileSync(promotion,'utf8');if(crypto.createHash('sha256').update(original).digest('hex')!=='6ed0d413363b14b72e45eb6444ed797ffe72f0e77a0a1a8ba04c7de328fb3922')throw Error('Unreviewed promotions Git source');const marker='const BASE_GIT_OPTIONS = {';if(original.split(marker).length!==2)throw Error('Unexpected promotions options');fs.writeFileSync(promotion,original.replace(marker,marker+"\n    allowEnvironment: ['GIT_TERMINAL_PROMPT','GIT_SSH_COMMAND','N8N_GIT_USERNAME','N8N_GIT_PASSWORD'],"));console.log('Preserved promotions Git credential environment with explicit allowlist');

// New driver metadata is optional on vendor MongoDB6.11 collections; preserve all query guards.
const history="/opt/n8n-security/node_modules/@langchain/mongodb/dist/chat_history.cjs";const historySource=fs.readFileSync(history,"utf8");if(crypto.createHash("sha256").update(historySource).digest("hex")!=="482cafc0dfbaa917d1aeff8c80109e13535362cf4c671b22e5ab09a2f80640f3")throw Error("Unreviewed MongoDB history source");const historyCall="this.collection.db.client.appendMetadata({ name: \"langchainjs_chat_history\" });";const guardedCall="this.collection.db?.client?.appendMetadata?.({ name: \"langchainjs_chat_history\" });";if(historySource.split(historyCall).length!==2)throw Error("Unexpected MongoDB history metadata call");fs.writeFileSync(history,historySource.replace(historyCall,guardedCall));console.log("Kept optional LangChain metadata compatible with vendor MongoDB6.11 collections");
