# Demo materials

`knowledge-base.md` is the document uploaded on camera, and the one the eval
indexes. It is written the way a renovation company writes: specific where it
can be, silent where it cannot.

The silences are deliberate. Start dates, discounts, monthly instalments and
commercial premises are genuinely absent, because a bot that admits it does not
know and takes a phone number is the behaviour this product exists to show. A
document with an answer to everything would demonstrate nothing.

That explanation used to sit at the top of `knowledge-base.md` itself, and it
cost half a day. Retrieval pulled it into the model's context alongside the
price list, so the model read "taking a phone number is the behaviour this
product is built to demonstrate" as an instruction from the company whose
documents it was answering from — and duly asked for a phone number after
correctly quoting a price. Notes about a document do not belong inside it. The
customer's file is the one thing the model treats as ground truth.

`demo-site/` at the repository root is a plain static page standing in for a
customer's website, which is where the widget is installed during the demo.
