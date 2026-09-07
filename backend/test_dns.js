import dns from 'dns';
import dotenv from 'dotenv';
dotenv.config();

dns.setServers(['8.8.8.8', '8.8.4.4']);

const srvHost = process.env.MONGO_SRV_HOST || '_mongodb._tcp.cluster0.example.mongodb.net';

dns.resolveSrv(srvHost, (err, addresses) => {
  if (err) {
    console.error('SRV Error:', err);
  } else {
    console.log('SRV Addresses:', addresses);
  }
});
