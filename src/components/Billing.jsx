import React, { useState, useEffect } from 'react';
import { IoChevronDown, IoSearch } from "react-icons/io5";
import { FaPlus } from "react-icons/fa6";
import { HiOutlineBanknotes, HiBuildingOffice2 } from "react-icons/hi2";
import { FiUsers, FiDollarSign, FiBarChart2 } from "react-icons/fi";
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const Billing = () => {
    const navigate = useNavigate();
    const [viewAgencyModal, setViewAgencyModal] = useState(null);
    const [editPricingModal, setEditPricingModal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [totalClients, setTotalClients] = useState(0);
    const [activeClients, setActiveClients] = useState(0);
    const [totalAgencies, setTotalAgencies] = useState(0);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [agenciesSnap, clientsSnap] = await Promise.all([
                    getDocs(collection(db, "agencies")),
                    getDocs(collection(db, "clients"))
                ]);

                // Clients
                const clients = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTotalClients(clients.length);
                setActiveClients(clients.filter(c => c.clientStatus && c.clientStatus.toLowerCase() === "active").length);

                // Agencies
                const agencies = agenciesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTotalAgencies(agencies.length);

                // Group agencies by agencyType
                const typeMap = {}; // e.g. { "Government": [...], "Private": [...], "Non Profit": [...] }
                agencies.forEach(agency => {
                    let type = agency.agencyType || "Other";
                    // Normalize: treat "Family Forever" variants as Government
                    if (type.toLowerCase().includes("family forever")) {
                        type = "Government";
                    }
                    if (!typeMap[type]) typeMap[type] = [];
                    typeMap[type].push(agency);
                });

                // Descriptions & colors for known types
                const typeMeta = {
                    "Government": { desc: "Government agencies and departments", color: "bg-purple-700" },
                    "Private": { desc: "Private family and Individuals", color: "bg-orange-600" },
                    "Non Profit": { desc: "Non Profit Organisations", color: "bg-blue-600" },
                };

                // Build category cards
                const cats = Object.keys(typeMap).map((type, idx) => {
                    const agencyList = typeMap[type];
                    const meta = typeMeta[type] || { desc: type, color: "bg-gray-600" };

                    // Aggregate service rates: average across all agencies in this type
                    // Collect all unique rate names from all agencies
                    const rateAggregates = {};
                    agencyList.forEach(agency => {
                        if (agency.rateList && Array.isArray(agency.rateList)) {
                            agency.rateList.forEach(r => {
                                if (!rateAggregates[r.name]) {
                                    rateAggregates[r.name] = [];
                                }
                                rateAggregates[r.name].push(r.rate || 0);
                            });
                        }
                    });

                    // Build rates object: show the rate (use the first non-zero or average)
                    const rates = {};
                    Object.keys(rateAggregates).forEach(name => {
                        const values = rateAggregates[name];
                        // Show first non-zero rate, or 0
                        const nonZero = values.find(v => v > 0);
                        rates[name] = nonZero !== undefined ? nonZero : 0;
                    });

                    return {
                        id: idx + 1,
                        title: type,
                        desc: meta.desc,
                        colorClass: meta.color,
                        agencyCount: agencyList.length,
                        rates,
                        agencies: agencyList.map(a => ({
                            name: a.name || "Unknown",
                            email: a.email || "",
                            address: a.address || "",
                            phone: a.phone || "",
                        })),
                    };
                });

                setCategories(cats);
            } catch (error) {
                console.error("Error fetching billing data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="p-6 min-h-screen bg-gray-50" style={{ fontFamily: "'Roboto', Helvetica, Arial, sans-serif" }}>
            {loading && <div className="text-center py-10 text-gray-500">Loading billing data...</div>}

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-light-black">Billing</h1>
                <div className="flex items-center text-sm text-gray-500">
                    Filter <span className="ml-2 px-3 py-1 border rounded bg-white text-green-600 cursor-pointer flex items-center gap-1">Weekly <IoChevronDown /></span>
                </div>
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Clients" value={String(totalClients)} sub={`${activeClients} Active`} icon={<FiUsers />} iconColor="text-green-600" />
                <StatCard label="Total Agencies" value={String(totalAgencies).padStart(2, '0')} sub="Active Partnerships" icon={<HiBuildingOffice2 />} iconColor="text-blue-600" />
                <StatCard label="Total Revenue" value="$0" sub="From all Agencies" icon={<FiDollarSign />} iconColor="text-purple-600" />
                <StatCard label="Average Per Client" value={totalClients > 0 ? `$0` : "$0"} sub="Average Charge" icon={<FiBarChart2 />} iconColor="text-orange-600" />
            </div>

            {/* Services Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-light-black">Services</h2>
                        <p className="text-sm text-gray-500 mt-1">Include details about: activities, medications, meals, mood, interactions, health observations, and any concerns.</p>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm space-y-3">
                    <div>
                        <strong className="text-light-black">Cancellation more than 24 Hours</strong>
                        <p className="text-gray-600">• If a service is cancelled more than 24 hours from the start time of the said service no billing will occur.</p>
                    </div>
                    <div>
                        <strong className="text-light-black">Cancellation less than 24 Hours</strong>
                        <p className="text-gray-600">• If the service is cancelled within 24 hours time frame prior to the start time of the service said service will still be billed.</p>
                    </div>
                    <div>
                        <strong className="text-light-black">On Shift Cancellation</strong>
                        <p className="text-gray-600">• If the service is cancelled after the start of the service billing will occur for the full hours of the service. (the entire shift).</p>
                    </div>
                </div>
            </div>

            {/* Billing Services Filter Bar */}
            <div className="bg-white p-6 rounded-t-xl shadow-sm border border-gray-100 border-b-0">
                <h2 className="text-lg font-bold text-light-black">Billing Services</h2>
                {/* <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="relative w-full max-w-sm">
                        <IoSearch className="absolute left-3 top-2.5 text-gray-400" />
                        <input type="text" placeholder="Search with Agency name.." className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:border-green-500" />
                    </div>

                    <div className="flex items-center gap-4 text-sm font-medium text-gray-700">
                        <div className="flex items-center gap-2 ml-4">
                            Shift Category <span className="text-green-600 flex items-center gap-1 cursor-pointer">Respite Care <IoChevronDown /></span>
                        </div>
                    </div>
                </div> */}
            </div>

            {/* Billing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 pt-0 rounded-b-xl shadow-sm border border-gray-100 border-t-0">
                {categories.map((cat) => (
                    <div key={cat.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                        {/* Card Header (Colored) */}
                        <div className={`p-6 text-white ${cat.colorClass}`}>
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-3">
                                <HiBuildingOffice2 className="text-xl text-white" />
                            </div>
                            <h3 className="text-xl font-bold">{cat.title}</h3>
                            <p className="text-white/80 text-sm mt-1">{cat.desc}</p>
                        </div>

                        {/* Stats Row */}
                        <div className="p-4 bg-gray-50 flex items-center justify-between border-b border-gray-100">
                            <div>
                                <p className="text-xs text-gray-500 flex items-center gap-1"><FiBarChart2 /> Total Revenue</p>
                                <p className="font-bold text-light-black">$0</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 flex items-center justify-end gap-1"><FiUsers /> Total Agencies</p>
                                <p className="font-bold text-light-black">{cat.agencyCount}</p>
                            </div>
                        </div>

                        {/* Service Rates */}
                        <div className="p-4 flex-1">
                            <h4 className="font-bold text-gray-700 mb-2 text-sm">Service Rates</h4>
                            <div className="space-y-2 text-sm">
                                {Object.entries(cat.rates).map(([name, rate]) => (
                                    <RateRow key={name} label={name} amount={rate} />
                                ))}
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="p-4 border-t border-gray-100 flex gap-3">
                            <button
                                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-1"
                                onClick={() => setViewAgencyModal(cat)}
                            >
                                View Agency
                            </button>
                            <button
                                className="flex-1 bg-green-800 text-white py-2 rounded hover:bg-green-900 text-sm font-medium flex items-center justify-center gap-1"
                                onClick={() => setEditPricingModal(cat)}
                            >
                                <FaPlus className="text-xs" /> Add Pricing
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* View Agency Modal */}
            {viewAgencyModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl"><HiBuildingOffice2 /></div>
                                <div>
                                    <h2 className="text-2xl font-bold">{viewAgencyModal.title}</h2>
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">{viewAgencyModal.agencyCount} Agency</span>
                                </div>
                            </div>
                            <div className='flex gap-4'>
                                <button className="bg-green-800 text-white px-4 py-2 rounded hover:bg-green-900" onClick={() => { setEditPricingModal(viewAgencyModal); setViewAgencyModal(null); }}>Edit Pricing</button>
                                <button onClick={() => setViewAgencyModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-3 gap-4 border-b bg-gray-50">
                            <ModalStat label="Total Agencies" value={viewAgencyModal.agencyCount} sub={`${viewAgencyModal.agencyCount} Active`} />
                            <ModalStat label="Average Per Client" value="$0" sub="Average Charge" />
                            <ModalStat label="Total Revenue" value="$0" sub="From all Agencies" />
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <h3 className="font-bold text-lg mb-4">Client List</h3>
                            <table className="w-full text-left text-sm">
                                <thead className="text-gray-500 border-b">
                                    <tr>
                                        <th className="pb-2 font-medium">Agency Name</th>
                                        <th className="pb-2 font-medium">E-mail</th>
                                        <th className="pb-2 font-medium">Address</th>
                                        <th className="pb-2 font-medium">Phone No</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {viewAgencyModal.agencies.length > 0 ? viewAgencyModal.agencies.map((agency, i) => (
                                        <tr key={i} className="py-2">
                                            <td className="py-3 text-green-700 font-medium">{agency.name}</td>
                                            <td className="py-3 text-gray-600">{agency.email}</td>
                                            <td className="py-3 text-gray-600">{agency.address}</td>
                                            <td className="py-3 text-gray-600">{agency.phone}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" className="py-4 text-center text-gray-500">No agencies found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}


            {/* Edit Pricing Modal */}
            {editPricingModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold">Edit {editPricingModal.title} Pricing</h2>
                                <p className="text-sm text-gray-500">Update the pricing structure for {editPricingModal.title} category</p>
                            </div>
                            <button onClick={() => setEditPricingModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Header Widget */}
                            <div className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50">
                                <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center"><HiBuildingOffice2 className="text-gray-600" /></div>
                                <div>
                                    <h3 className="font-bold text-lg">{editPricingModal.title}</h3>
                                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">{editPricingModal.agencyCount} Agency</span>
                                </div>
                            </div>

                            {/* Global Rate */}
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">All Kilometer Rate</label>
                                    <input type="text" defaultValue="150$" className="w-full border rounded-md p-2 text-sm" placeholder="Enter rate" />
                                </div>
                                <button className="bg-green-800 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm h-[38px]">For All Services</button>
                            </div>

                            <hr />

                            <div>
                                <h3 className="font-bold text-lg mb-4">Pricing Method</h3>
                                <div className="space-y-4">
                                    <PricingCard title="Emergent Care" color="bg-pink-100 text-pink-700" icon="$" />
                                    <PricingCard title="Supervised Visitations" color="bg-orange-100 text-orange-700" icon="$" />
                                    <PricingCard title="Respite Care" color="bg-blue-100 text-blue-700" icon="$" />
                                    <PricingCard title="Transportations" color="bg-purple-100 text-purple-700" icon="$" />
                                </div>
                            </div>

                            <hr />

                            {/* Cancellation Pricing */}
                            <div>
                                <h3 className="font-bold text-lg mb-4">Cancellation Pricing</h3>
                                <div className="space-y-4">
                                    <div className="border rounded-lg p-4">
                                        <h4 className="font-bold text-sm text-gray-800 mb-3">On Shift Cancellation</h4>
                                        <p className="text-xs text-gray-500 mb-2">Billing for cancellation after the start of the service (full shift hours)</p>
                                        <input type="text" defaultValue="$0" placeholder="Enter price" className="w-full border rounded p-2 text-sm text-gray-600" />
                                    </div>
                                    <div className="border rounded-lg p-4">
                                        <h4 className="font-bold text-sm text-gray-800 mb-3">Cancellation Before 24 Hrs</h4>
                                        <p className="text-xs text-gray-500 mb-2">Billing for cancellation more than 24 hours before the service</p>
                                        <input type="text" defaultValue="$0" placeholder="Enter price" className="w-full border rounded p-2 text-sm text-gray-600" />
                                    </div>
                                    <div className="border rounded-lg p-4">
                                        <h4 className="font-bold text-sm text-gray-800 mb-3">Cancellation After 24 Hrs</h4>
                                        <p className="text-xs text-gray-500 mb-2">Billing for cancellation within 24 hours of the service start time</p>
                                        <input type="text" defaultValue="$0" placeholder="Enter price" className="w-full border rounded p-2 text-sm text-gray-600" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

const StatCard = ({ label, value, sub, icon, iconColor }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-32">
        <div className="flex justify-between items-start">
            <div className={`text-2xl ${iconColor}`}>{icon}</div>
        </div>
        <div>
            <h3 className="text-2xl font-bold text-light-black">{value}</h3>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <span className={`text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 mt-1 inline-block`}>{sub}</span>
        </div>
    </div>
);

const RateRow = ({ label, amount }) => (
    <div className="flex justify-between items-center py-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-bold text-light-black">${amount.toFixed(2)}</span>
    </div>
);

const ModalStat = ({ label, value, sub }) => (
    <div className="bg-white p-4 rounded border border-gray-100">
        <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
        <h4 className="text-2xl font-bold mt-1">{value}</h4>
        <p className="text-xs text-gray-400">{sub}</p>
    </div>
);

const PricingCard = ({ title, color, icon }) => (
    <div className="border rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl bg-green-800 text-white`}>
                $
            </div>
            <div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>{title}</span>
                <p className="text-xs text-gray-400 mt-0.5">See a Specific Charge For this Category</p>
            </div>
        </div>
        <div className="flex gap-4 items-end">
            <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Pricing for {title}</label>
                <input type="text" defaultValue="$150" placeholder="Enter price" className="w-full border rounded p-2 text-sm text-gray-600" />
            </div>
            <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Kilometer Rate</label>
                <input type="text" defaultValue="150$" placeholder="Enter km rate" className="w-full border rounded p-2 text-sm text-gray-600" />
            </div>
            <button className="bg-green-800 text-white px-4 py-2 rounded text-sm hover:bg-green-900">Apply</button>
        </div>
    </div>
);

export default Billing;
