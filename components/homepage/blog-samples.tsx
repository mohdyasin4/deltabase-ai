import { TrendingUp, Server, Users, Briefcase, Globe, Monitor, DollarSign, BarChart, Wifi } from "lucide-react" // Icons for use cases

export default function UseCasesSection() {

  const useCases = [
    {
      id: 1,
      title: "Retail Analytics",
      description: "Analyze sales patterns, optimize inventory, and forecast demand using Deltabase dashboards.",
      icon: <TrendingUp className="text-blue-600 w-6 h-6" />,
    },
    {
      id: 2,
      title: "SaaS Applications",
      description: "Connect multiple databases, embed dashboards, and deliver real-time insights to your clients.",
      icon: <Server className="text-green-600 w-6 h-6" />,
    },{
      id: 3,
      title: "IoT Analytics",
      description: "Monitor IoT device data, analyze sensor readings, and optimize performance with real-time insights.",
      icon: <Wifi className="text-yellow-400 w-6 h-6" />,
    },    
    {
      id: 4,
      title: "Development Teams",
      description: "Simplify data access, manage multiple databases, and collaborate on real-time analysis with your team.",
      icon: <Users className="text-orange-600 w-6 h-6" />,
    },
    {
      id: 5,
      title: "Global Enterprises",
      description: "Scale your data insights across global teams, integrating seamlessly with multiple data sources.",
      icon: <Globe className="text-teal-600 w-6 h-6" />,
    },
    {
      id: 6,
      title: "Finance & Investment",
      description: "Visualize financial data, monitor KPIs, and gain real-time insights into portfolio performance.",
      icon: <DollarSign className="text-yellow-600 w-6 h-6" />,
    },
    {
      id: 7,
      title: "Startups",
      description: "Leverage data for user behavior tracking, growth analysis, and rapid decision-making.",
      icon: <BarChart className="text-red-600 w-6 h-6" />,
    },
    {
      id: 8,
      title: "Product Management",
      description: "Track feature usage, A/B test results, and gather insights to guide product development.",
      icon: <Monitor className="text-pink-600 w-6 h-6" />,
    }
  ];

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-4">How Deltabase Empowers Businesses</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
        Discover how Deltabase can enhance your data strategies across various industries.
      </p>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-full">
        {useCases.map((useCase) => (
          <div
            key={useCase.id}
            className="w-full flex flex-col p-4 border rounded-lg shadow hover:shadow-md transition-all dark:bg-black dark:border-gray"
          >
            <div className="flex items-center gap-3 mb-3">
              {useCase.icon}
              <h3 className="text-md font-bold">{useCase.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{useCase.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
