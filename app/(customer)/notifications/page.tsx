import { NotificationsTable } from "./NotificationsTable";


function NotificationPage() {
  return (
    <div className="container mx-auto p-2">
    <h1 className="text-2xl font-semibold">Notifications</h1>
      <p className="text-sm text-muted-foreground">
        Notifications of your account and orders.
      </p>
      <div>
       <NotificationsTable/>
      </div>
    </div>
  );
}

export default NotificationPage;
