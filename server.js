const Koa = require('koa');
const logger = require('koa-logger');
const Router = require('koa-router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const Config = require('./Config');
const stripe = require('stripe')(Config.STRIPE_SECRET);
const {google} = require('googleapis');

const app = new Koa();
let router = new Router();

app.use(logger());
app.use(bodyParser());
app.use(cors());

router.post('/hook', (ctx, next) => {
    let sig = ctx.request.headers['stripe-signature'];

    try {
        let event = stripe.webhooks.constructEvent(ctx.request.rawBody, sig, Config.ENDPOINT_SECRET)
        console.log(event);
    } catch (e) {
        ctx.throw(400, e);
    }

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