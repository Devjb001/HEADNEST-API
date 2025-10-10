const User = require('../models/User.js');


const validateAnonymousName = async (req, res) => {
  try {
    const { anonymousName } = req.body;

    if (!anonymousName)
      return res.status(400).json({ message: 'Anonymous name is required' });

    const nameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!nameRegex.test(anonymousName))
      return res.status(400).json({ message: 'Invalid format. Use 3–20 letters, numbers or underscores.' });

    const nameExists = await User.findOne({ anonymousName: anonymousName.toLowerCase() });
    if (nameExists)
      return res.status(409).json({ message: 'Anonymous name already taken' });

    return res.status(200).json({ message: 'Anonymous name is available' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



const setAnonymousName = async (req, res) => {
  try {
    const { anonymousName } = req.body;
    const userId = req.user.id;

    if (!anonymousName)
      return res.status(400).json({ message: 'Anonymous name is required' });

    const nameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!nameRegex.test(anonymousName))
      return res.status(400).json({ message: 'Invalid format. Use 3 to 20 letters, numbers or underscores.' });

    // Check if name already taken
    const nameExists = await User.findOne({ anonymousName: anonymousName.toLowerCase() });
    if (nameExists)
      return res.status(409).json({ message: 'Anonymous name already taken' });

    // Save to current user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { anonymousName: anonymousName.toLowerCase() },
      { new: true }
    );

    return res.status(200).json({
      message: 'Anonymous name set successfully',
      anonymousName: updatedUser.anonymousName
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


module.exports = {
  validateAnonymousName, setAnonymousName
}