import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaUserCircle } from "react-icons/fa";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";

interface Workspace {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  invitedEmails?: string[];
  createdAt: Date;
}

const logoLight = "/assets/logo_light.png";
const logoDark = "/assets/logo_dark.png";

const Workspaces: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/auth");
      return;
    }

    // Subscribe to workspaces where user is a member
    const workspacesRef = collection(db, "workspaces");
    const workspacesQuery = query(
      workspacesRef,
      where("members", "array-contains", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      workspacesQuery,
      (snapshot) => {
        const workspacesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          createdBy: doc.data().createdBy,
          members: doc.data().members,
          invitedEmails: doc.data().invitedEmails,
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        setWorkspaces(workspacesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching workspaces:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [navigate]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim() || !auth.currentUser) return;

    setIsCreating(true);
    try {
      const workspacesRef = collection(db, "workspaces");
      const newWorkspace = await addDoc(workspacesRef, {
        name: newWorkspaceName.trim(),
        createdBy: auth.currentUser.uid,
        members: [auth.currentUser.uid],
        invitedEmails: [],
        createdAt: serverTimestamp(),
      });

      // Create a general channel for the new workspace
      const channelsRef = collection(db, "channels");
      await addDoc(channelsRef, {
        name: "general",
        workspaceId: newWorkspace.id,
        createdAt: serverTimestamp(),
      });

      setNewWorkspaceName("");
      const modal = document.getElementById(
        "create-workspace-modal"
      ) as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      console.error("Error creating workspace:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!workspaceId.trim() || !currentUser?.email) return;

    setIsJoining(true);
    setJoinError("");

    try {
      const workspaceRef = doc(db, "workspaces", workspaceId.trim());
      const workspaceSnap = await getDoc(workspaceRef);

      if (!workspaceSnap.exists()) {
        setJoinError("Workspace not found");
        return;
      }

      const workspaceData = workspaceSnap.data() as Workspace;

      // Check if user is already a member by UID
      if (workspaceData.members.includes(currentUser.uid)) {
        navigate(`/workspace/${workspaceId}`);
        return;
      }

      if (
        !workspaceData.invitedEmails?.some((emailOrPattern) => {
          const userEmail = currentUser.email;
          if (!userEmail) return false;

          try {
            // Check if the entry is a valid regex pattern
            const regex = new RegExp(emailOrPattern, "i");
            return regex.test(userEmail);
          } catch (e) {
            // If it's not a valid regex, treat it as a normal email
            return emailOrPattern.toLowerCase() === userEmail.toLowerCase();
          }
        })
      ) {
        setJoinError("You have not been invited to this workspace");
        return;
      }

      // Add user to workspace members using UID
      await updateDoc(workspaceRef, {
        members: arrayUnion(currentUser.uid),
        invitedEmails: workspaceData.invitedEmails.filter(
          (email) => email !== currentUser.email
        ),
      });

      navigate(`/workspace/${workspaceId}`);
    } catch (error) {
      console.error("Error joining workspace:", error);
      setJoinError("Failed to join workspace");
    } finally {
      setIsJoining(false);
    }
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    navigate(`/workspace/${workspaceId}`);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-base-200 flex flex-col">
      <div className="navbar bg-base-300 sticky top-0 z-10">
        <div className="flex-1">
          <div className="px-4">
            <img
              src={logoLight}
              className="h-14 block dark:hidden"
              alt="ZapZing Logo"
            />
            <img
              src={logoDark}
              className="h-8 hidden dark:block"
              alt="ZapZing Logo"
            />
          </div>
        </div>
        <div className="flex-none gap-2 px-4">
          <button
            className="btn btn-primary"
            onClick={() => {
              const modal = document.getElementById(
                "create-workspace-modal"
              ) as HTMLDialogElement;
              if (modal) modal.showModal();
            }}
          >
            <FaPlus className="w-4 h-4 mr-2" />
            Create Workspace
          </button>
          <div className="dropdown dropdown-end">
            <label
              tabIndex={0}
              className="btn btn-ghost btn-circle relative text-base-content"
            >
              <FaUserCircle className="w-6 h-6" />
            </label>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
            >
              <li key="sign-out">
                <a
                  onClick={handleSignOut}
                  className="hover:bg-base-200 active:bg-base-300 px-4 py-2 rounded-lg text-error"
                >
                  Sign out
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold text-base-content">
              Your Workspaces
            </h1>
            <form
              onSubmit={handleJoinWorkspace}
              className="join w-full md:w-auto"
            >
              <input
                type="text"
                placeholder="Enter workspace ID"
                className="input input-bordered join-item flex-1 md:flex-none text-base-content placeholder:text-base-content/60"
                value={workspaceId}
                onChange={(e) => {
                  setWorkspaceId(e.target.value);
                  setJoinError("");
                }}
              />
              <button
                type="submit"
                className={`btn btn-primary join-item ${
                  isJoining ? "loading" : ""
                }`}
                disabled={isJoining || !workspaceId.trim()}
              >
                Join Workspace
              </button>
            </form>
          </div>

          {joinError && (
            <div className="alert alert-error mb-4">
              <span>{joinError}</span>
            </div>
          )}

          {workspaces.length === 0 ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <h2 className="card-title justify-center text-base-content">
                  No Workspaces Yet
                </h2>
                <p className="text-base-content/70">
                  Create your first workspace or join an existing one!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer"
                  onClick={() => handleSelectWorkspace(workspace.id)}
                >
                  <div className="card-body">
                    <h2 className="card-title text-base-content">
                      {workspace.name}
                    </h2>
                    <p className="text-base-content/70">
                      {workspace.members.length} member
                      {workspace.members.length !== 1 ? "s" : ""}
                    </p>
                    <div className="card-actions justify-end mt-4">
                      <button className="btn btn-primary btn-sm">Open</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Workspace Modal */}
      <dialog id="create-workspace-modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4 text-base-content">
            Create a Workspace
          </h3>
          <form onSubmit={handleCreateWorkspace}>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content">
                  Workspace Name
                </span>
              </label>
              <input
                type="text"
                placeholder="e.g. My Team"
                className="input input-bordered w-full text-base-content placeholder:text-base-content/60"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                required
              />
            </div>
            <div className="modal-action">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const modal = document.getElementById(
                    "create-workspace-modal"
                  ) as HTMLDialogElement;
                  if (modal) modal.close();
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn-primary ${isCreating ? "loading" : ""}`}
                disabled={isCreating || !newWorkspaceName.trim()}
              >
                {isCreating ? "Creating..." : "Create Workspace"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
};

export default Workspaces;
