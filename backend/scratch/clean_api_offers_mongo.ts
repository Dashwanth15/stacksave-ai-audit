import 'dotenv/config';
import { connectDB, NotificationEventModel } from '../src/services/dbService';

async function updateApiOffers() {
  await connectDB();

  // Anthropic Prompt Caching
  const promptCaching = await NotificationEventModel.findOne({
    providerId: 'anthropic-api',
    title: /Prompt Caching/i,
    isActive: { $ne: false },
  });
  if (promptCaching) {
    promptCaching.offerType = 'API_DISCOUNT';
    (promptCaching as any).offerSubtype = 'API_DISCOUNT';
    (promptCaching as any).category = 'api';
    promptCaching.benefit = '90% Off Cache Reads';
    promptCaching.discount = '90% Off Cache Reads';
    (promptCaching as any).destinationUrl = 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching';
    await promptCaching.save();
    console.log('Updated Anthropic Prompt Caching:', promptCaching._id.toString());
  }

  // Anthropic Message Batches
  const messageBatches = await NotificationEventModel.findOne({
    providerId: 'anthropic-api',
    title: /Message Batches/i,
    isActive: { $ne: false },
  });
  if (messageBatches) {
    messageBatches.offerType = 'API_DISCOUNT';
    (messageBatches as any).offerSubtype = 'API_DISCOUNT';
    (messageBatches as any).category = 'api';
    messageBatches.benefit = '50% Off Batches';
    messageBatches.discount = '50% Off Batches';
    (messageBatches as any).destinationUrl = 'https://docs.anthropic.com/en/docs/build-with-claude/batch-processing';
    await messageBatches.save();
    console.log('Updated Anthropic Message Batches:', messageBatches._id.toString());
  }

  // DeepSeek Off-Peak
  const deepseek = await NotificationEventModel.findOne({
    providerId: 'deepseek',
    title: /Off-Peak/i,
    isActive: { $ne: false },
  });
  if (deepseek) {
    deepseek.offerType = 'API_DISCOUNT';
    (deepseek as any).offerSubtype = 'API_DISCOUNT';
    (deepseek as any).category = 'api';
    deepseek.benefit = '50% Off-Peak';
    deepseek.discount = '50% Off-Peak';
    (deepseek as any).destinationUrl = 'https://api-docs.deepseek.com/quick_start/pricing/';
    await deepseek.save();
    console.log('Updated DeepSeek Off-Peak:', deepseek._id.toString());
  }

  // Kimi / Moonshot
  const kimi = await NotificationEventModel.findOne({
    providerId: 'kimi',
    title: /Moonshot.*Free Credit/i,
    isActive: { $ne: false },
  });
  if (kimi) {
    kimi.offerType = 'API_DISCOUNT';
    (kimi as any).offerSubtype = 'API_DISCOUNT';
    (kimi as any).category = 'api';
    kimi.benefit = '¥15 Free Credits';
    kimi.discount = '¥15 Free Credits';
    (kimi as any).destinationUrl = 'https://platform.moonshot.cn/pricing';
    await kimi.save();
    console.log('Updated Moonshot / Kimi:', kimi._id.toString());
  }

  process.exit(0);
}

updateApiOffers().catch(console.error);
