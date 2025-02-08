"use client";
import React, { useState, useEffect, ChangeEvent } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { client } from "@/sanity/lib/client";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Configure the Sanity client

// Define TypeScript interfaces for the order data
interface OrderProduct {
  quantity: number;
  product: {
    name: string;
    price: number;
  };
}

interface OrderPayment {
  totalAmount: number;
  method: string;
  status: string;
}

interface OrderShipment {
  carrierName: string;
  labelPdf: string;
  trackingId: string;
  shipmentRate: number;
  status: string;
}

interface Order {
  _id: string;
  _createdAt: string;
  userId: string;
  payment: OrderPayment;
  shipment: OrderShipment;
  products: OrderProduct[];
}

const Dashboard: React.FC = () => {
  // State variables with types
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Fetch orders from Sanity on component mount
  useEffect(() => {
    const auth = localStorage.getItem("authorized");
    if (auth !== "true") {
      router.push("/login");
    }

    const query = `
      *[_type == "order"]{
        _id,
        _createdAt,
        userId,
        payment,
        shipment,
        products[]{
          quantity,
          product->{
            name,
            price
          }
        }
      }
    `;
    client
      .fetch<Order[]>(query)
      .then((data) => setOrders(data))
      .catch((err) => console.error("Error fetching orders:", err));
  }, []);

  // Open modal for updating shipment status
  const openModal = (order: Order): void => {
    setSelectedOrder(order);
    setUpdateStatus(order.shipment.status);
    setIsModalOpen(true);
  };

  // Update the shipment status in Sanity and locally
  const handleUpdate = (): void => {
    if (!selectedOrder) return;
    client
      .patch(selectedOrder._id)
      .set({ "shipment.status": updateStatus })
      .commit()
      .then(() => {
        // Fetch the updated order to get complete data
        return client.fetch<Order>(
          `
            *[_type == "order" && _id == $orderId][0]{
              _id,
              _createdAt,
              userId,
              payment,
              shipment,
              products[]{
                quantity,
                product->{
                  name,
                  price
                }
              }
            }
          `,
          { orderId: selectedOrder._id }
        );
      })
      .then((updatedOrder) => {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === updatedOrder._id ? updatedOrder : order
          )
        );
        setIsModalOpen(false);
      })
      .catch((err: Error) => console.error("Error updating order:", err));
  };

  // Analytics calculations
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (acc, order) => acc + order.payment.totalAmount,
    0
  );

  // Prepare data for the revenue trend graph
  // Group revenue by day using _createdAt date
  // Prepare full date range and ensure all days are represented
  const generateDateRange = (startDate: Date, endDate: Date): string[] => {
    const dates: string[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(currentDate.toLocaleDateString());
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  // Extract date range
  const orderDates = orders.map((order) => new Date(order._createdAt));
  const startDate = orderDates.length
    ? new Date(Math.min(...orderDates.map((d) => d.getTime())))
    : new Date();
  const endDate = new Date(); // Today's date

  // Generate full date range
  const allDates = generateDateRange(startDate, endDate);

  // Create revenue and orders count mapping
  const revenueByDate: Record<string, number> = {};
  const ordersByDate: Record<string, number> = {};

  orders.forEach((order) => {
    const date = new Date(order._createdAt).toLocaleDateString();
    revenueByDate[date] =
      (revenueByDate[date] || 0) + order.payment.totalAmount;
    ordersByDate[date] = (ordersByDate[date] || 0) + 1;
  });

  // Map all dates, ensuring missing dates have zero values
  const revenueData = allDates.map((date) => revenueByDate[date] || 0);
  const ordersData = allDates.map((date) => ordersByDate[date] || 0);

  // Chart Data
  const chartData = {
    labels: allDates,
    datasets: [
      {
        label: "Revenue ($)",
        data: revenueData,
        borderColor: "#4ade80", // Tailwind green-400
        backgroundColor: "rgba(74, 222, 128, 0.5)",
        tension: 0.3,
      },
      {
        label: "Orders",
        data: ordersData,
        borderColor: "#60a5fa", // Tailwind blue-400
        backgroundColor: "rgba(96, 165, 250, 0.5)",
        tension: 0.3,
      },
    ],
  };

  // Chart Options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: "white" },
      },
      title: {
        display: true,
        text: "Daily Orders & Sales Trend",
        color: "white",
      },
    },
    scales: {
      x: {
        ticks: { color: "white" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
      y: {
        ticks: { color: "white" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
    },
  };

  // Handle change in select input for status update
  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setUpdateStatus(e.target.value);
  };

  return (
    <SidebarProvider>
          <AppSidebar /> 
          <main>
          <SidebarTrigger />
    <div className="min-h-screen  text-white p-8">
      <h1 className="text-3xl font-bold mb-6">E-commerce Dashboard</h1>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Total Orders</h2>
          <p className="text-3xl">{totalOrders}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Total Revenue</h2>
          <p className="text-3xl">${totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Graph Section */}
      <div className="bg-gray-800 p-6 rounded-lg w-full shadow mb-8">
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Orders Table */}
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Orders</h2>
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left">Order ID</th>
              <th className="px-6 py-3 text-left">User ID</th>
              <th className="px-6 py-3 text-left">Total Amount</th>
              <th className="px-6 py-3 text-left">Shipment Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {orders.map((order) => (
              <tr key={order._id}>
                <td className="px-6 py-4">{order._id}</td>
                <td className="px-6 py-4">{order.userId}</td>
                <td className="px-6 py-4">
                  ${order.payment.totalAmount.toFixed(2)}
                </td>
                <td className="px-6 py-4 capitalize">
                  {order.shipment.status}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => openModal(order)}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded"
                  >
                    Update Status
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for Updating Shipment Status */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-2xl font-semibold mb-4">
              Update Shipment Status
            </h2>
            <select
              value={updateStatus}
              onChange={handleSelectChange}
              className="w-full p-2 bg-gray-700 rounded mb-4"
            >
              <option value="pending">Pending</option>
              <option value="shipped">Shipped</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="returned">Returned</option>
            </select>
            <div className="flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-gray-600 hover:bg-gray-500 text-white py-1 px-3 rounded mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </main>
    </SidebarProvider>
  );
};

export default Dashboard;
