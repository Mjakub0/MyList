import React, { useState } from 'react';
import MembersModal from './MembersModal';
import { useTranslation } from 'react-i18next';
import './App.css';

function ShoppingList({ list, setLists, lists, user, onDelete }) {
  const [newItemName, setNewItemName] = useState('');
  const [isMembersModalVisible, setIsMembersModalVisible] = useState(false);
  const { t } = useTranslation();

  const handleAddItem = () => {
    if (newItemName) {
      fetch('http://localhost:5000/api/addItem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ listId: list._id, itemName: newItemName })
      })
        .then(response => response.json())
        .then(updatedList => {
          setLists(lists.map(l => l._id === list._id ? updatedList : l));
          setNewItemName('');
        })
        .catch(error => console.error('Error adding item:', error));
    }
  };

  const handleMarkItemAsResolved = (itemId) => {
    fetch('http://localhost:5000/api/markItemAsResolved', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ listId: list._id, itemId })
    })
      .then(response => response.json())
      .then(updatedList => {
        setLists(lists.map(l => l._id === list._id ? updatedList : l));
      })
      .catch(error => console.error('Error marking item as resolved:', error));
  };

  const handleDeleteItem = (itemId) => {
    fetch('http://localhost:5000/api/deleteItem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ listId: list._id, itemId })
    })
      .then(response => response.json())
      .then(updatedList => {
        setLists(lists.map(l => l._id === list._id ? updatedList : l));
      })
      .catch(error => console.error('Error deleting item:', error));
  };

  return (
    <div>
      <h2>{list.name}</h2>
      <button onClick={onDelete}>{t("delete_list")}</button>
      <button onClick={() => setIsMembersModalVisible(true)}>{t("manage_members")}</button>
      <input
        type="text"
        placeholder={t("add_item")}
        value={newItemName}
        onChange={(e) => setNewItemName(e.target.value)}
      />
      <button onClick={handleAddItem}>{t("add_item")}</button>
      {list.items && (
        <ul className="item-list">
          {list.items.map(item => (
            <li key={item._id} className={`item ${item.status === 'resolved' ? 'resolved' : ''}`}>
              {item.itemName}
              {item.status !== 'resolved' && <button className="mark-resolved" onClick={() => handleMarkItemAsResolved(item._id)}>✔</button>}
              <button className="remove-item" onClick={() => handleDeleteItem(item._id)}>✖</button>
            </li>
          ))}
        </ul>
      )}
      {isMembersModalVisible && <MembersModal list={list} setLists={setLists} user={user} setShowMembers={setIsMembersModalVisible} />}
    </div>
  );
}

export default ShoppingList;