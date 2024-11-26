import React from 'react'
import ManageNotificationForm from './NotificationForm'

export const metadata = {
  title: "Manage Notifications",
  description: "Manage your notification preferences.",
};
function Page() {
  return (
    <div className=''>
        <h1 className="text-xl font-semibold mb-2">Manage Notifications</h1>
        <p className="text-sm text-gray-500 mb-6">
          Customize your notification preferences to ensure you receive the most relevant updates.
        </p>
      <ManageNotificationForm/>
    </div>
  )
}

export default Page
