import { VercelRequest, VercelResponse } from '@vercel/node';
import { ethers } from 'ethers';

const SUBSCRIPTION_WALLET = '0xf03bdaDc156152d294969970F88482A88385E35E'; // ← your wallet
const REQUIRED_SDA = ethers.parseUnits('2', 18); // 2 SDA in wei
const SDA_TOKEN = '0x49d3f5d89f369cb2e3700dd14e6a7abdd77d6b9a'; // official SDA ERC-20
const provider = new ethers.JsonRpcProvider('https://node.sidrachain.com');
const iface = new ethers.Interface(['event Transfer(address,address,uint256)']);

export default async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { addr, month } = req.query as { addr?: string; month?: string };
  if (!addr || !month) return res.status(400).json({ paid: false });

  // Look for 2-SDA transfer to your wallet in last 30 days
  const topic = ethers.id('Transfer(address,address,uint256)');
  const toTopic = ethers.zeroPadValue(SUBSCRIPTION_WALLET, 32);
  const logs = await provider.getLogs({ address: SDA_TOKEN, topics: [topic, null, toTopic], fromBlock: -43200 });
  for (const l of logs) {
    const { args } = iface.parseLog(l);
    if (args.value < REQUIRED_SDA) continue;
    const tx = await provider.getTransaction(l.transactionHash);
    if (tx && tx.data.toLowerCase().includes(addr.slice(2).toLowerCase())) return res.json({ paid: true, tx: l.transactionHash });
  }
  return res.json({ paid: false });
};
