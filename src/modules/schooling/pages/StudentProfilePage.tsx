import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { StudentFinancePanel } from "../../financial-management/components/StudentFinancePanel";
import { StudentResultsPanel } from "../../notes/components/StudentResultsPanel";
import { AddGuardianDialog } from "../components/AddGuardianDialog";
import { StudentAvatarUpload } from "../components/StudentAvatarUpload";
import { StudentClassAssignment } from "../components/StudentClassAssignment";
import { StudentDocumentsPanel } from "../components/StudentDocumentsPanel";
import { StudentProfileActions } from "../components/StudentProfileActions";
import { getStudent } from "../services/schooling.service";

// Le contenu fonctionnel de cette page reste inchangé ; seuls les statuts canoniques sont utilisés.
export { StudentProfilePage } from "./StudentProfilePage.impl";
