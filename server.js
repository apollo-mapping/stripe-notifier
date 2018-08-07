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
        if (event.type === 'charge.succeeded') {
            let today = new Date();
            let data = event.data.object;
            let email = makeSuccessEmail(data.metadata.customer_name, data.amount, data.metadata['Quote/Invoice #'],
                data.card.brand, data.card.last4, data.card.name, today.getMonth()+1 + '/' + today.getDate() + '/' +
                today.getFullYear(), data.metadata['Company Name'], data.metadata.Description);
            console.log(email);
            console.log(data);
        } else {

        }
    } catch (e) {
        ctx.throw(400, e);
    }

    ctx.status = 200;
    ctx.body = {
        message: 'Mamma mia'
    }
});

let makeSuccessEmail = (name, amount, invoice, cardType, lastFour, owner, date, company, description) => {
    return "<p>Dear " + name + "</p>\n\n<p>Here is the receipt for your payment of <b>$" + amount + "</b>" +
        " referencing quote/invoice number <b>" + invoice + "</b> charged to a <b>" + cardType + "</b> card " +
        "ending in <b>" + lastFour + "</b> and belonging to <b>" + owner + "</b> on <b>" + date + "</b>.</p>\n\n" +
        "<p>The following company name and description (if entered) goes along with your charge: " +
        "<b>" + company + "</b>; <b>" + description + "</b>.</p>\n\n" +
        "<p>We appreciate your patronage and look forward to working with you in the future!</p>\n\n" +
        "<p>-- The Apollo Mapping Team</p>";
};

let makeErrorEmail = () => {

};

app.use(router.routes());
app.use(router.allowedMethods());


app.listen(Config.PORT, () => {
    console.log('Running on port: ' + Config.PORT);
});