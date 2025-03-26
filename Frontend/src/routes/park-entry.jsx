import { createFileRoute, redirect } from '@tanstack/react-router';
import ParkEntryForm from '../components/Client/ParkEntryForm';
import { isLoggedIn } from '../hooks/useAuth';

export const Route = createFileRoute('/park-entry')({
  beforeLoad: async ({ location }) => {
    if (!isLoggedIn()) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: ParkEntryPage,
});

function ParkEntryPage() {
  return <ParkEntryForm />;
}

export default ParkEntryPage; 