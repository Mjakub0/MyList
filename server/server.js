const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const cors = require('cors');

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Database connection
mongoose.connect('mongodb://localhost:27017/shoppinglistapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas and Models
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const shoppingListSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{ itemName: String, status: String }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});
const ShoppingList = mongoose.model('ShoppingList', shoppingListSchema);

// Routes
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    console.log('Received data:', { username, email, password });
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this username or email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.json(newUser);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    console.log('Login attempt:', { username, password });
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
      res.json(user);
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Error logging in user' });
  }
});

app.post('/api/createShoppingList', async (req, res) => {
  const { name, owner } = req.body;
  try {
    const user = await User.findOne({ username: owner });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    const newList = new ShoppingList({ name, owner: user._id, items: [], members: [user._id] });
    await newList.save();
    res.json(newList);
  } catch (error) {
    res.status(500).json({ error: 'Error creating shopping list' });
  }
});

app.get('/api/getShoppingLists', async (req, res) => {
  const { username } = req.query;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    const lists = await ShoppingList.find({ $or: [{ owner: user._id }, { members: user._id }] });
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching shopping lists' });
  }
});

app.post('/api/addItem', async (req, res) => {
  const { listId, itemName } = req.body;
  try {
    const list = await ShoppingList.findById(listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    list.items.push({ itemName, status: 'pending' });
    await list.save();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Error adding item' });
  }
});

app.post('/api/markItemAsResolved', async (req, res) => {
  const { listId, itemId } = req.body;
  try {
    const list = await ShoppingList.findById(listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    const item = list.items.id(itemId);
    if (item) {
      item.status = 'resolved';
      await list.save();
      res.json(list);
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error marking item as resolved' });
  }
});

app.post('/api/inviteMember', async (req, res) => {
  const { listId, username, owner } = req.body;
  try {
    const list = await ShoppingList.findById(listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    const ownerUser = await User.findOne({ username: owner });
    if (!ownerUser || !list.owner.equals(ownerUser._id)) {
      return res.status(403).json({ error: 'You do not have permission to invite members to this list' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!list.members.includes(user._id)) {
      list.members.push(user._id);
      await list.save();
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Error inviting member' });
  }
});

app.delete('/api/deleteShoppingList', async (req, res) => {
  const { listId, username } = req.body;
  try {
    const list = await ShoppingList.findById(listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    const user = await User.findOne({ username });
    if (!user || !list.owner.equals(user._id)) {
      return res.status(403).json({ error: 'You do not have permission to delete this list' });
    }
    await ShoppingList.findByIdAndDelete(listId);
    res.json({ status: 'success', message: 'List deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting shopping list' });
  }
});

app.post('/api/getMembers', async (req, res) => {
  const { listId } = req.body;
  try {
    const list = await ShoppingList.findById(listId).populate('members', 'username');
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    res.json({ members: list.members });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching members' });
  }
});

app.post('/api/removeMember', async (req, res) => {
  const { listId, memberId } = req.body;
  try {
    const list = await ShoppingList.findById(listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    list.members = list.members.filter(member => !member.equals(memberId));
    await list.save();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Error removing member' });
  }
});

app.post('/api/deleteItem', async (req, res) => {
  const { listId, itemId } = req.body;
  try {
    const list = await ShoppingList.findById(listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    list.items = list.items.filter(item => item._id.toString() !== itemId);
    await list.save();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Error deleting item' });
  }
});

app.post('/api/checkOwner', async (req, res) => {
  const { listId, userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  try {
    const list = await ShoppingList.findById(listId);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    const isOwner = list.owner.equals(userId);
    res.json({ isOwner });
  } catch (error) {
    res.status(500).json({ error: 'Error checking owner' });
  }
});

app.listen(5000, async () => {
  console.log("Server is listening on port 5000")
})