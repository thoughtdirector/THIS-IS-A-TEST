import { Flex, Spinner } from "@chakra-ui/react"
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import Sidebar from "../components/Common/Sidebar"
import UserMenu from "../components/Common/UserMenu"
import useAuth, { isLoggedIn } from "../hooks/useAuth"


const ActivateOrganization = () => {
  return (
    <Flex justify="center" align="center" height="100vh" width="full">
      <h1>Please activate an organization</h1>
    </Flex>
   )
}

function ActivateOrganizationHandler() {
  const { isLoading } = useAuth()
  const organization_id = localStorage.getItem("organization_id") || ""

  return (
    <>
     
      {
        organization_id?(<Outlet />):(
          <ActivateOrganization />
        )
      }
     
    </>
  )
}
export default ActivateOrganizationHandler
