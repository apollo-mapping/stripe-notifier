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
        let event = stripe.webhooks.constructEvent(ctx.request.rawBody, sig, Config.ENDPOINT_SECRET);
        let data = event.data.object;
        if (event.type === 'charge.succeeded') {
            let email = makeSuccessEmail(data);
            console.log(email);
        } else {
            let email = makeErrorEmail(data);
            console.log(email);
        }
    } catch (e) {
        ctx.throw(400, e);
    }

    ctx.status = 200;
    ctx.body = {
        message: 'Mamma mia'
    }
});

let makeSuccessEmail = (data) => {
    let today = new Date();
    let date = today.getMonth()+1 + '/' + today.getDate() + '/' + today.getFullYear();
    return "<p>Dear " + data.metadata.customer_name + "</p>\n\n<p>Here is the receipt for your payment of <b>$" + data.amount + "</b>" +
        " referencing quote/invoice number <b>" + data.metadata['Quote/Invoice #'] + "</b> charged to a <b>" + data.card.brand + "</b> card " +
        "ending in <b>" + data.card.last4 + "</b> and belonging to <b>" + data.card.name + "</b> on <b>" + date + "</b>.</p>\n\n" +
        "<p>The following company name and description (if entered) goes along with your charge: " +
        "<b>" + data.metadata['Company Name'] + "</b>; <b>" + data.metadata.Description + "</b>.</p>\n\n" +
        "<p>We appreciate your patronage and look forward to working with you in the future!</p>\n\n" +
        "<p>-- The Apollo Mapping Team</p>";
};

let makeErrorEmail = (data) => {
    let today = new Date();
    let date = today.getMonth()+1 + '/' + today.getDate() + '/' + today.getFullYear();
    return "<p>Dear " + data.metadata.customer_name + ",</p>\n\n" +
        "<p>There was a failed charge to your credit card!</p>\n\n" +
        "<p>Specifically, it was a failed payment of <b>$" + data.amount + "</b> referencing quite/invoice number " +
        "<b>" + data.metadata['Quote/Invoice #'] + "</b> charged to a <b>" + data.card.brand + "</b> card  ending " +
        "in <b>" + data.card.last4 + "</b> and belonging to <b>" + data.card.name + "</b> on <b>" + date + "</b>.</p>\n\n" +
        "<p>The following company name and description (if entered) goes along with your failed charge: " +
        "<b>" + data.metadata['Company Name'] + "</b>; <b>" + data.metadata.Description + "</b>.</p>\n\n" +
        "<p>And this is the charge failure  message: <b>" + data.failure_message + "</b></p>\n\n" +
        "<p>-- The Apollo Mapping Team</p>";
};

app.use(router.routes());
app.use(router.allowedMethods());


app.listen(Config.PORT, () => {
    console.log('Running on port: ' + Config.PORT);
});