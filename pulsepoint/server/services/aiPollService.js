// Load environment variables first
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Now import other dependencies
const OpenAI = require('openai');
const Poll = require('../models/Poll');

// Debug: Log if API key is loaded
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
console.log('OpenAI API Key:', hasOpenAIKey ? 'Loaded' : 'Not loaded');

// Initialize OpenAI only if API key is available
let openai = null;
if (hasOpenAIKey) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Fallback poll data to use when OpenAI API is not available
const FALLBACK_POLLS = [
  {
    question: "What's your favorite programming language?",
    description: "Vote for your preferred programming language!",
    options: ["JavaScript", "Python", "Java", "C++"],
    tags: ["technology", "programming"]
  },
  {
    question: "How do you prefer to spend your weekends?",
    description: "Share how you like to relax on weekends!",
    options: ["Outdoor activities", "Binge-watching shows", "Reading books", "Spending time with family/friends"],
    tags: ["lifestyle", "fun"]
  },
  {
    question: "Which social media platform do you use the most?",
    description: "Let's see which platform is the most popular!",
    options: ["Facebook", "Instagram", "Twitter", "TikTok"],
    tags: ["technology", "social media"]
  },
  {
    question: "What's your go-to breakfast?",
    description: "Breakfast is the most important meal of the day!",
    options: ["Cereal", "Eggs and toast", "Pancakes/Waffles", "Smoothie"],
    tags: ["food", "lifestyle"]
  },
  {
    question: "How do you prefer to work?",
    description: "Work preferences in the modern world",
    options: ["Fully remote", "Hybrid model", "Fully in-office", "Freelance/Contract"],
    tags: ["work", "lifestyle"]
  }
];

const generateDailyPolls = async () => {
  // Always use fallback if OpenAI is not configured
  if (!openai || !hasOpenAIKey) {
    console.log('OpenAI not configured, using fallback polls');
    return await createPollsFromFallback();
  }
  
  let polls = [];
  let usingFallback = false;
  
  try {
    // First, check if we have any polls for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingPolls = await Poll.find({
      createdAt: { $gte: today },
      isDailyPoll: true
    });
    
    if (existingPolls.length > 0) {
      console.log('Polls already exist for today, skipping generation');
      return { success: true, message: 'Polls already exist for today', polls: existingPolls };
    }
    
    // Try to generate polls using OpenAI
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates engaging poll questions for a social media platform. Generate 5 unique poll questions with 4 options each. Return the response as a JSON array of objects with 'question', 'description', 'options' (array), and 'tags' (array) properties."
          },
          {
            role: "user",
            content: "Please generate 5 engaging poll questions with 4 options each on various topics like technology, lifestyle, entertainment, etc."
          }
        ],
        temperature: 0.8,
        max_tokens: 1000
      });

      // Parse the response
      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          // Try to parse the JSON response
          polls = JSON.parse(content);
          console.log('Successfully generated polls using OpenAI');
        } catch (parseError) {
          console.error('Error parsing OpenAI response:', parseError);
          usingFallback = true;
        }
      } else {
        console.error('No content in OpenAI response');
        usingFallback = true;
      }
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError.message);
      console.log('Falling back to predefined polls due to API error');
      usingFallback = true;
    }

    // If we're using fallback or no polls were generated, use the fallback data
    if (usingFallback || polls.length === 0) {
      console.log('Using fallback poll data');
      return await createPollsFromFallback();
    }

    // Create polls in the database
    const createdPolls = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // Polls expire in 24 hours
    
    // Get admin user ID
    const adminUserId = await getAdminUserId();

    for (const poll of polls) {
      try {
        const newPoll = new Poll({
          question: poll.question,
          description: poll.description || '',
          options: poll.options.map(option => ({
            text: option,
            votes: 0,
            voters: []
          })),
          createdBy: adminUserId,
          expiresAt,
          isActive: true,
          isDailyPoll: true,
          tags: poll.tags || [],
          totalVotes: 0
        });

        await newPoll.save();
        createdPolls.push(newPoll);
      } catch (dbError) {
        console.error('Error saving poll to database:', dbError.message);
        // Continue with the next poll even if one fails
        continue;
      }
    }

    // If no polls were created (all failed), use fallback
    if (createdPolls.length === 0) {
      console.log('All poll creations failed, using fallback');
      return await createPollsFromFallback();
    }

    return createdPolls;
  } catch (error) {
    console.error('Error generating daily polls:', error);
    throw error;
  }
};

// Helper function to get admin user ID
async function getAdminUserId() {
  try {
    const User = require('../models/User');
    const admin = await User.findOne({ email: 'admin@pulsepoint.in' });
    if (admin) {
      return admin._id;
    }
    
    // If admin doesn't exist, create one
    const newAdmin = await User.create({
      username: 'admin',
      email: 'admin@pulsepoint.in',
      password: 'Admin@123', // This should be changed after first login
      role: 'admin'
    });
    
    return newAdmin._id;
  } catch (error) {
    console.error('Error getting admin user ID:', error);
    throw new Error('Failed to get admin user ID');
  }
}

// Helper function to create polls from fallback data
async function createPollsFromFallback() {
  const createdPolls = [];
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1);
  
  try {
    // Get admin user ID
    const adminUserId = await getAdminUserId();
    
    for (const poll of FALLBACK_POLLS) {
      try {
        const newPoll = new Poll({
          question: poll.question,
          description: poll.description || '',
          options: poll.options.map(option => ({
            text: option,
            votes: 0,
            voters: []
          })),
          createdBy: adminUserId,
          expiresAt,
          isActive: true,
          isDailyPoll: true,
          tags: poll.tags || [],
          totalVotes: 0
        });

        await newPoll.save();
        createdPolls.push(newPoll);
      } catch (error) {
        console.error('Error creating fallback poll:', error.message);
        continue;
      }
    }
    
    return createdPolls;
  } catch (error) {
    console.error('Error in createPollsFromFallback:', error.message);
    throw error;
  }
}

module.exports = {
  generateDailyPolls
};
