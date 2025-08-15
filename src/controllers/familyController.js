const familyRepository = require('../repositories/familyRepository');

class FamilyController {
  async getAllMembers(req, res) {
    try {
      const members = await familyRepository.getAll();
      res.json(members);
    } catch (error) {
      console.error('Error fetching family members:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMemberById(req, res) {
    try {
      const { id } = req.params;
      const member = await familyRepository.findById(id);

      if (!member) {
        return res.status(404).json({ error: 'Family member not found' });
      }

      res.json(member);
    } catch (error) {
      console.error('Error fetching family member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createMember(req, res) {
    try {
      const {
        firstName, lastName, maidenName, gender, birthDate, deathDate,
        birthPlace, occupation, biography, profilePhotoUrl,
        fatherId, motherId, spouseId
      } = req.body;

      // Helper function to convert empty strings to null for date fields
      const normalizeDate = (date) => {
        if (typeof date === 'string' && date.trim() === '') return null;
        if (date === null || date === undefined) return null;
        return date;
      };

      // Helper function to convert empty strings to null for UUID fields
      const normalizeUuid = (uuid) => {
        if (typeof uuid === 'string' && uuid.trim() === '') return null;
        if (uuid === null || uuid === undefined) return null;
        return uuid;
      };

      // Normalize input data
      const normalizedBirthDate = normalizeDate(birthDate);
      const normalizedDeathDate = normalizeDate(deathDate);
      const normalizedFatherId = normalizeUuid(fatherId);
      const normalizedMotherId = normalizeUuid(motherId);
      const normalizedSpouseId = normalizeUuid(spouseId);

      // Input validation
      const errors = [];
      
      if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
        errors.push('First name is required');
      }
      
      if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
        errors.push('Last name is required');
      }
      
      if (normalizedBirthDate && !/^\d{4}-\d{2}-\d{2}$/.test(normalizedBirthDate)) {
        errors.push('Birth date must be in YYYY-MM-DD format');
      }
      
      if (normalizedDeathDate && !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDeathDate)) {
        errors.push('Death date must be in YYYY-MM-DD format');
      }
      
      if (normalizedBirthDate && normalizedDeathDate && new Date(normalizedBirthDate) >= new Date(normalizedDeathDate)) {
        errors.push('Birth date must be before death date');
      }
      
      if (firstName && firstName.trim().length > 50) {
        errors.push('First name must be 50 characters or less');
      }
      
      if (lastName && lastName.trim().length > 50) {
        errors.push('Last name must be 50 characters or less');
      }
      
      if (gender && !['M', 'F'].includes(gender.toUpperCase())) {
        errors.push('Gender must be M (Male) or F (Female)');
      }

      if (errors.length > 0) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors 
        });
      }

      const member = await familyRepository.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        maidenName: maidenName && maidenName.trim() !== '' ? maidenName.trim() : null,
        gender: gender ? gender.toUpperCase() : null,
        birthDate: normalizedBirthDate,
        deathDate: normalizedDeathDate,
        birthPlace: birthPlace && birthPlace.trim() !== '' ? birthPlace.trim() : null,
        occupation: occupation && occupation.trim() !== '' ? occupation.trim() : null,
        biography: biography && biography.trim() !== '' ? biography.trim() : null,
        profilePhotoUrl: profilePhotoUrl && profilePhotoUrl.trim() !== '' ? profilePhotoUrl.trim() : null,
        fatherId: normalizedFatherId,
        motherId: normalizedMotherId,
        spouseId: normalizedSpouseId
      });

      res.status(201).json(member);
    } catch (error) {
      console.error('Error creating family member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateMember(req, res) {
    try {
      const { id } = req.params;
      const {
        firstName, lastName, maidenName, gender, birthDate, deathDate,
        birthPlace, occupation, biography, profilePhotoUrl,
        fatherId, motherId, spouseId
      } = req.body;

      // Helper function to convert empty strings to null for date fields
      const normalizeDate = (date) => {
        if (typeof date === 'string' && date.trim() === '') return null;
        if (date === null || date === undefined) return null;
        return date;
      };

      // Helper function to convert empty strings to null for UUID fields
      const normalizeUuid = (uuid) => {
        if (typeof uuid === 'string' && uuid.trim() === '') return null;
        if (uuid === null || uuid === undefined) return null;
        return uuid;
      };

      // Normalize input data
      const normalizedBirthDate = normalizeDate(birthDate);
      const normalizedDeathDate = normalizeDate(deathDate);
      const normalizedFatherId = normalizeUuid(fatherId);
      const normalizedMotherId = normalizeUuid(motherId);
      const normalizedSpouseId = normalizeUuid(spouseId);

      const member = await familyRepository.update(id, {
        firstName: firstName && firstName.trim() !== '' ? firstName.trim() : null,
        lastName: lastName && lastName.trim() !== '' ? lastName.trim() : null,
        maidenName: maidenName && maidenName.trim() !== '' ? maidenName.trim() : null,
        gender: gender ? gender.toUpperCase() : null,
        birthDate: normalizedBirthDate,
        deathDate: normalizedDeathDate,
        birthPlace: birthPlace && birthPlace.trim() !== '' ? birthPlace.trim() : null,
        occupation: occupation && occupation.trim() !== '' ? occupation.trim() : null,
        biography: biography && biography.trim() !== '' ? biography.trim() : null,
        profilePhotoUrl: profilePhotoUrl && profilePhotoUrl.trim() !== '' ? profilePhotoUrl.trim() : null,
        fatherId: normalizedFatherId,
        motherId: normalizedMotherId,
        spouseId: normalizedSpouseId
      });

      if (!member) {
        return res.status(404).json({ error: 'Family member not found' });
      }

      res.json(member);
    } catch (error) {
      console.error('Error updating family member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteMember(req, res) {
    try {
      const { id } = req.params;
      const member = await familyRepository.delete(id);

      if (!member) {
        return res.status(404).json({ error: 'Family member not found' });
      }

      res.json({ message: 'Family member deleted successfully' });
    } catch (error) {
      console.error('Error deleting family member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new FamilyController();