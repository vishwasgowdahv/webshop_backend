import amqp from "amqplib";
import Order from "../models/Order.js";


const QUEUE = "order.response.queue";

const consumeMQ = async () => {
  const channel = await (
    await amqp.connect("amqp://localhost")
  ).createChannel();
  await channel.assertQueue(QUEUE, { durable: true });

  console.log(`Waiting for messages on queue: ${QUEUE}`);

  channel.consume(
    QUEUE,
    async (msg) => {
      if (!msg) return;

      const ERP_ID = JSON.parse(msg.content).ERP_ID;
      await Order.findByIdAndUpdate(msg.properties.correlationId,{ERP_ID:ERP_ID})
      console.log("CorrelationId:", msg.properties.correlationId);
      console.log("Payload:", ERP_ID);

      channel.ack(msg);
    },
    { noAck: false }
  );
};

export default consumeMQ