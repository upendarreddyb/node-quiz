const Service = require('node-windows').Service;

const svc = new Service({
    name: "nodeservice",
    description: "This is our description",
    script: "C:\\React js\\Projects(upr-praneeth)\\node-expressjs\\quiz-api\\bin\\www"
});

svc.on('install', function() {
    svc.start();
});

svc.install();