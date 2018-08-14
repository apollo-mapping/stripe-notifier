const Koa = require('koa');
const logger = require('koa-logger');
const Router = require('koa-router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const Config = require('./Config');
const stripe = require('stripe')(Config.STRIPE_SECRET);
const {google} = require('googleapis');
const auth = require('./auth');

let oauthClient = '';

auth((authClient) => {
    oauthClient = authClient;
});

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
            let subject = 'Apollo Mapping Payment Receipt: #' + data.metadata['Quote/Invoice #'];
            sendEmail(subject, email, data.metadata.customer_email);
            console.log(email);
        } else {
            let email = makeErrorEmail(data);
            let subject = 'Failed Apollo Mapping Charge: #' + data.metadata['Quote/Invoice #'];
            sendEmail(subject, email, data.metadata.customer_email);
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
    return "<p>Dear " + data.metadata.customer_name + "</p>\n\n<p>Here is the receipt for your payment of <b>$" + String((data.amount/100).toFixed(2)) + "</b>" +
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
        "<p>Specifically, it was a failed payment of <b>$" + String((data.amount/100).toFixed(2)) + "</b> referencing quite/invoice number " +
        "<b>" + data.metadata['Quote/Invoice #'] + "</b> charged to a <b>" + data.card.brand + "</b> card  ending " +
        "in <b>" + data.card.last4 + "</b> and belonging to <b>" + data.card.name + "</b> on <b>" + date + "</b>.</p>\n\n" +
        "<p>The following company name and description (if entered) goes along with your failed charge: " +
        "<b>" + data.metadata['Company Name'] + "</b>; <b>" + data.metadata.Description + "</b>.</p>\n\n" +
        "<p>And this is the charge failure  message: <b>" + data.failure_message + "</b></p>\n\n" +
        "<p>-- The Apollo Mapping Team</p>";
};

let sendEmail = (subject, content, to) => {
    let gmailClass = google.gmail('v1');

    let email_lines = [];

    email_lines.push('From: "' + Config.mail.from + '" <' + Config.mail.fromEmail + '>');
    email_lines.push('To: ' + to);
    email_lines.push('Cc: sales@apollomapping.com');
    email_lines.push('Content-type: text/html;charset=iso-8859-1');
    email_lines.push('MIME-Version: 1.0');
    email_lines.push('Subject: ' + subject);
    email_lines.push('');
    content = content.split('\n');
    for (let con of content)
        email_lines.push(con);

    let email = email_lines.join('\r\n').trim();

    let base64EncodedEmail = new Buffer(email).toString('base64');
    base64EncodedEmail = base64EncodedEmail.replace(/\+/g, '-').replace(/\//g, '_');

    gmailClass.users.messages.send({
        auth: oauthClient,
        userId: 'me',
        resource: {
            raw: base64EncodedEmail
        }
    }, (err, results) => {
        if (err) {
            console.log('err:', err);
        } else {
            console.log(results);
        }
    });
};

app.use(router.routes());
app.use(router.allowedMethods());


app.listen(Config.PORT, () => {
    console.log('Running on port: ' + Config.PORT);
});