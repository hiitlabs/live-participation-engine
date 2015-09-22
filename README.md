Presemo 4 - Live Participation Engine by Screen.io

---

Installation:  
`git clone`  
(dependencies are checked into this repository, so no npm update needed)  
`npm rebuild` (not always necessary)  

Run in development mode:  
```
node app/index.js
```
or  
```
sudo npm install -g nodemon
nodemon app/index.js
```

and navigate to  
http://localhost:3000/dev  
http://localhost:3000/dev/control  
http://localhost:3000/dev/screen  
http://localhost:3000/dev/stage  

To run more efficiently, use  
`NODE_ENV=production node app/index.js 1>>1.log 2>>2.log`  
 
Contributing 

Please feel free to open issues, send pull requests 

Licenses 

Presemo 4 - Live Participation Engine is licensed under AGPL3. 

There are also external modules checked in to this repository for convenience:  
```
presemo-engine-v4/app/node_modules  
├── async@0.6.2 (MIT) 
├── base64id@0.1.0 (MIT)  
├─┬ bunyan@0.22.2 (MIT)  
│ ├── dtrace-provider@0.2.8 (FreeBSD)  
│ └─┬ mv@2.0.0 (MIT)  
│   └── ncp@0.4.2 (MIT)  
├─┬ clean-css@2.1.8 (MIT)  
│ └── commander@2.1.0 (MIT)  
├── debug@0.8.0 (MIT)  
├── dirty@0.9.9 (MIT)  
├─┬ engine.io@0.7.12 (MIT)  
│ ├── debug@0.6.0 (MIT)  
│ ├── engine.io-parser@0.3.0 (MIT)  
│ └─┬ ws@0.4.31 (MIT)  
│   ├── commander@0.6.1 (MIT)  
│   ├── nan@0.3.2 (MIT)  
│   ├── options@0.0.5 (MIT)  
│   └── tinycolor@0.0.1 (MIT)  
├─┬ express@3.4.8 (MIT)  
│ ├── buffer-crc32@0.2.1 (MIT)  
│ ├─┬ commander@1.3.2 (MIT)  
│ │ └── keypress@0.1.0 (MIT)  
│ ├─┬ connect@2.12.0 (MIT)  
│ │ ├── batch@0.5.0 (MIT)  
│ │ ├── bytes@0.2.1 (MIT)  
│ │ ├── debug@0.8.0 (MIT)  
│ │ ├─┬ multiparty@2.2.0 (MIT)  
│ │ │ ├─┬ readable-stream@1.1.11 (MIT)  
│ │ │ │ ├── core-util-is@1.0.1 (MIT)  
│ │ │ │ ├── debuglog@0.0.2 (MIT)  
│ │ │ │ └── string_decoder@0.10.31 (MIT)  
│ │ │ └── stream-counter@0.2.0 (MIT)  
│ │ ├── negotiator@0.3.0 (MIT)  
│ │ ├── pause@0.0.1 (MIT)  
│ │ ├── qs@0.6.6 (MIT)  
│ │ ├── raw-body@1.1.2 (MIT)  
│ │ └── uid2@0.0.3 (MIT)  
│ ├── cookie@0.1.0 (MIT)  
│ ├── cookie-signature@1.0.1 (MIT)  
│ ├── debug@0.8.0 (MIT)  
│ ├── fresh@0.2.0 (MIT)  
│ ├── merge-descriptors@0.0.1 (MIT)  
│ ├── methods@0.1.0 (MIT)  
│ ├── range-parser@0.0.4 (MIT)  
│ └─┬ send@0.1.4 (MIT)  
│   ├── debug@0.8.0 (MIT)  
│   └── mime@1.2.11 (MIT)  
├─┬ glob@3.2.9 (FreeBSD)  
│ ├── inherits@2.0.1 (ISC)  
│ └─┬ minimatch@0.2.14 (MIT)  
│   ├── lru-cache@2.5.0 (MIT)  
│   └── sigmund@1.0.0 (FreeBSD)  
├── mkdirp@0.3.5 (MIT)  
├── rimraf@2.2.6 (MIT)  
├─┬ uglify-js@2.4.13 (FreeBSD)  
│ ├── async@0.2.10 (MIT)  
│ ├─┬ optimist@0.3.7 (MIT)  
│ │ └── wordwrap@0.0.2 (MIT)  
│ ├─┬ source-map@0.1.33 (New BSD)  
│ │ └── amdefine@0.1.0 (New BSD or MIT)  
│ └── uglify-to-browserify@1.0.2 (MIT)  
├── underscore@1.6.0 (MIT)  
└─┬ useragent@2.0.8 (MIT)  
  └── lru-cache@2.2.4 (MIT)  
````

Client libraries used  
```
json2@2013-05-26 (Public Domain)  
component-require@0.2.2 (MIT)  
underscore@1.5.1 (MIT)  
engine.io-client@0.7, with patches (MIT)  
es5-shim (MIT)  
es5-sham (MIT)  
html5-shiv@3.7.0 (MIT)  
jquery@1.10.2 (MIT)  
boostrapjs@3.1.0 (MIT)  
fastclick@0.6.11 (MIT)  
modernizr@2.6.2 (MIT)  
momentjs@2.0.0 (MIT)  
respondjs@1.3.0 (MIT)  
noUiSlider@7.0.0 (WTFPL)  
d3.js@3.4.11 (MIT)  
nv.d3.js@1.1.15b (MIT)  
```
