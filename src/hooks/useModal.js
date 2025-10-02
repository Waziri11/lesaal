import { useState } from 'react';

/**
 * Custom hook for managing modal state
 * @returns {Object} Modal state and control functions
 */
export const useModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  /**
   * Open modal with selected item
   * @param {*} item - The item to display in modal
   */
  const openModal = (item) => {
    setSelectedItem(item);
    setIsOpen(true);
  };

  /**
   * Close modal and clear selected item
   */
  const closeModal = () => {
    setIsOpen(false);
    setSelectedItem(null);
  };

  return {
    isOpen,
    selectedItem,
    openModal,
    closeModal
  };
};
