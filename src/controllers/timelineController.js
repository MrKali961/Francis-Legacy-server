const timelineRepository = require('../repositories/timelineRepository');

class TimelineController {
  async getAllEvents(req, res) {
    try {
      const events = await timelineRepository.getAll();
      res.json(events);
    } catch (error) {
      console.error('Error fetching timeline events:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getEventById(req, res) {
    try {
      const { id } = req.params;
      const event = await timelineRepository.findById(id);

      if (!event) {
        return res.status(404).json({ error: 'Timeline event not found' });
      }

      res.json(event);
    } catch (error) {
      console.error('Error fetching timeline event:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createEvent(req, res) {
    try {
      const {
        title, description, eventDate, eventType, location,
        associatedMemberId, imageUrl
      } = req.body;

      const event = await timelineRepository.create({
        title,
        description,
        eventDate,
        eventType,
        location,
        associatedMemberId,
        imageUrl,
        createdBy: req.user.id
      });

      res.status(201).json(event);
    } catch (error) {
      console.error('Error creating timeline event:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateEvent(req, res) {
    try {
      const { id } = req.params;
      const {
        title, description, eventDate, eventType, location,
        associatedMemberId, imageUrl
      } = req.body;

      const event = await timelineRepository.update(id, {
        title,
        description,
        eventDate,
        eventType,
        location,
        associatedMemberId,
        imageUrl
      });

      if (!event) {
        return res.status(404).json({ error: 'Timeline event not found' });
      }

      res.json(event);
    } catch (error) {
      console.error('Error updating timeline event:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      const event = await timelineRepository.delete(id);

      if (!event) {
        return res.status(404).json({ error: 'Timeline event not found' });
      }

      res.json({ message: 'Timeline event deleted successfully' });
    } catch (error) {
      console.error('Error deleting timeline event:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getEventsByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      const events = await timelineRepository.getByDateRange(startDate, endDate);
      res.json(events);
    } catch (error) {
      console.error('Error fetching events by date range:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getEventsByType(req, res) {
    try {
      const { type } = req.params;
      const events = await timelineRepository.getByEventType(type);
      res.json(events);
    } catch (error) {
      console.error('Error fetching events by type:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new TimelineController();