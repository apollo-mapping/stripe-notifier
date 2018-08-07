const Koa = require('koa');
const logger = require('koa-logger');
const Router = require('koa-router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const Config = require('./Config');
const {google} = require('googleapis');

const app = new Koa();
let router = new Router();

app.use(logger());
app.use(bodyParser());
app.use(cors());

router.post('/hook', (ctx, next) => {
    console.log(ctx.request.body.data.object);

    ctx.status = 200;
    ctx.body = {
        message: 'Mamma mia'
    }
});

app.use(router.routes());
app.use(router.allowedMethods());


app.listen(Config.PORT, () => {
    console.log('Running on port: ' + Config.PORT);
})