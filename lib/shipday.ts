export interface OrderInfoRequest {
  orderNumber: string;
  customerName: string;
  customerAddress: string;
  customerEmail: string;
  customerPhoneNumber: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhoneNumber: string;
  expectedDeliveryDate: string;
  expectedPickupTime: string;
  expectedDeliveryTime: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  orderItem: {
    name: string;
    quantity: number;
    unitPrice: number;
    detail: string;
  }[];
  tips?: number;
  tax: number;
  discountAmount?: number;
  deliveryFee?: number;
  totalOrderCost: number;
  pickupInstruction?: string;
  deliveryInstruction?: string;
  orderSource: string;
  additionalId?: string;
  clientRestaurantId?: number;
  paymentMethod?: string;
  creditCardType?: string;
  creditCardId?: number;
}

export interface EditOrderRequest {
  orderId?: string;
  orderNo?: string;
  customerName?: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhoneNumber?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantPhoneNumber?: string;
  expectedDeliveryDate?: string;
  expectedPickupTime?: string;
  expectedDeliveryTime?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  tip?: number;
  tax?: number;
  discountAmount?: number;
  deliveryFee?: number;
  totalCost?: string;
  deliveryInstruction?: string;
  orderSource?: string;
  additionalId?: string;
  clientRestaurantId?: number;
  paymentMethod?: string;
  creditCardType?: string;
  creditCardId?: number;
}

class shipDay {
  async createOrder(orderInfoRequest: OrderInfoRequest) {
    const url = `https://api.shipday.com/orders`;
    const requestBody = JSON.stringify(orderInfoRequest);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${process.env.SHIPDAY_API_KEY}`,
        },
        body: requestBody,
      });
      const data = await response.json();
      if (data.success) {
        return data;
      } else {
        console.error("API Error Response:", data); // Log the entire response
        throw new Error(data.response || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }

  async editOrder(orderId: string, orderInfoRequest: EditOrderRequest) {
    const url = `https://api.shipday.com/order/edit/${orderId}`;
    const requestBody = JSON.stringify(orderInfoRequest);

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${process.env.SHIPDAY_API_KEY}`,
        },
        body: requestBody,
      });
      const data = await response.json();
      if (data.success) {
        return data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("Error editing order:", error);
      throw error;
    }
  }

  async fetchOrder(orderNumber: string) {
    const url = `https://api.shipday.com/orders/${orderNumber}`;
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Basic ${process.env.SHIPDAY_API_KEY}`,
      },
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching order:", error);
      throw error;
    }
  }

  async deleteOrder(orderNumber: string) {
    const url = `https://api.shipday.com/orders/${orderNumber}`;
    const options = {
      method: "DELETE",
      headers: {
        accept: "application/json",
        Authorization: `Basic ${process.env.SHIPDAY_API_KEY}`,
      },
    };

    try {
      const response = await fetch(url, options);
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      return data;
    } catch (error) {
      console.error("Error deleting order:", error);
      throw error;
    }
  }
}

const shipDayInstance = new shipDay();
export default shipDayInstance;
