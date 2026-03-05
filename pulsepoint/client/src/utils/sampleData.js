// Sample users for posts and polls
const sampleUsers = [
  {
    _id: 'user1',
    username: 'news_enthusiast',
    name: 'Alex Johnson',
    avatar: 'https://i.pravatar.cc/150?img=1'
  },
  {
    _id: 'user2',
    username: 'tech_watcher',
    name: 'Sam Wilson',
    avatar: 'https://i.pravatar.cc/150?img=2'
  },
  {
    _id: 'user3',
    username: 'sports_fan',
    name: 'Jordan Lee',
    avatar: 'https://i.pravatar.cc/150?img=3'
  },
  {
    _id: 'user4',
    username: 'science_geek',
    name: 'Taylor Smith',
    avatar: 'https://i.pravatar.cc/150?img=4'
  }
];

// Generate sample posts
export const generateSamplePosts = () => {
  return [
    {
      _id: 'post1',
      content: 'Just read about the new AI developments. The future is here and it\'s fascinating how quickly technology is advancing!',
      user: sampleUsers[0],
      likes: ['user2', 'user3'],
      comments: [
        {
          _id: 'comment1',
          content: 'I agree! The latest GPT models are mind-blowing.',
          user: sampleUsers[1],
          likes: [],
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ],
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      _id: 'post2',
      content: 'The recent climate change report is alarming. We need to take immediate action to protect our planet!',
      user: sampleUsers[2],
      likes: ['user1', 'user3', 'user4'],
      comments: [
        {
          _id: 'comment2',
          content: 'Absolutely! Everyone needs to do their part.',
          user: sampleUsers[0],
          likes: ['user2'],
          createdAt: new Date(Date.now() - 1800000).toISOString()
        }
      ],
      createdAt: new Date(Date.now() - 5400000).toISOString()
    },
    {
      _id: 'post3',
      content: 'The new Mars rover has sent back incredible images. The possibilities for space exploration are endless!',
      user: sampleUsers[3],
      likes: ['user1', 'user2'],
      comments: [],
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];
};

// Generate sample polls
export const generateSamplePolls = () => {
  return [
    {
      _id: 'poll1',
      question: 'What\'s your preferred way to stay updated with news?',
      options: [
        { _id: 'opt1', text: 'Social Media', votes: 15 },
        { _id: 'opt2', text: 'News Websites', votes: 25 },
        { _id: 'opt3', text: 'Mobile Apps', votes: 20 },
        { _id: 'opt4', text: 'TV/Radio', votes: 10 }
      ],
      totalVotes: 70,
      createdBy: sampleUsers[0],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      userVotes: {}
    },
    {
      _id: 'poll2',
      question: 'Which tech trend excites you the most in 2023?',
      options: [
        { _id: 'opt5', text: 'AI & Machine Learning', votes: 30 },
        { _id: 'opt6', text: 'Metaverse', votes: 15 },
        { _id: 'opt7', text: 'Web3 & Blockchain', votes: 20 },
        { _id: 'opt8', text: 'Quantum Computing', votes: 25 }
      ],
      totalVotes: 90,
      createdBy: sampleUsers[1],
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      userVotes: {}
    },
    {
      _id: 'poll3',
      question: 'How many hours per day do you spend on social media?',
      options: [
        { _id: 'opt9', text: 'Less than 1 hour', votes: 10 },
        { _id: 'opt10', text: '1-2 hours', votes: 25 },
        { _id: 'opt11', text: '3-4 hours', votes: 35 },
        { _id: 'opt12', text: 'More than 4 hours', votes: 30 }
      ],
      totalVotes: 100,
      createdBy: sampleUsers[2],
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      userVotes: {}
    }
  ];
};

// Function to initialize sample data in localStorage if not exists
export const initializeSampleData = () => {
  if (!localStorage.getItem('sampleDataInitialized')) {
    const samplePosts = generateSamplePosts();
    const samplePolls = generateSamplePolls();
    
    // Store in localStorage (for demo purposes)
    localStorage.setItem('samplePosts', JSON.stringify(samplePosts));
    localStorage.setItem('samplePolls', JSON.stringify(samplePolls));
    localStorage.setItem('sampleDataInitialized', 'true');
    
    return { posts: samplePosts, polls: samplePolls };
  }
  
  // Return existing data from localStorage
  return {
    posts: JSON.parse(localStorage.getItem('samplePosts') || '[]'),
    polls: JSON.parse(localStorage.getItem('samplePolls') || '[]')
  };
};
